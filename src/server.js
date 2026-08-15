import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { CRITERIOS, PESO_TOTAL, calcularNota, compararVersoes } from './rubrica.js';
import { avaliar } from './avaliador.js';
import {
  criarEquipe,
  buscarEquipe,
  ultimaSubmissao,
  salvarSubmissao,
  historico,
  ranking,
  limparTudo,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORTA = Number(process.env.PORT) || 8080;

const MIN_CARACTERES = 40;
const MAX_CARACTERES = 6000;
const INTERVALO_MIN_MS = 5000; // trava anti-duplo-clique por equipe

app.use(express.json({ limit: '256kb' }));
app.use(express.static(join(__dirname, '..', 'public')));

const ultimoEnvio = new Map();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    servico: 'oficina-avaliador',
    modelo: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    chave_configurada: Boolean(process.env.DEEPSEEK_API_KEY),
    criterios: CRITERIOS.length,
    peso_total: PESO_TOTAL,
  });
});

app.get('/api/rubrica', (_req, res) => {
  res.json({
    peso_total: PESO_TOTAL,
    criterios: CRITERIOS.map(({ id, titulo, peso, pergunta, ancoras }) => ({
      id,
      titulo,
      peso,
      pergunta,
      ancoras,
    })),
  });
});

const CODIGO_OFICINA = (process.env.CODIGO_OFICINA || 'UNICAP').trim().toUpperCase();
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/equipes', (req, res) => {
  const nome = String(req.body?.nome ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const codigo = String(req.body?.codigo ?? '').trim().toUpperCase();

  if (nome.length < 3) {
    return res.status(400).json({ erro: 'Informe seu nome completo (ao menos 3 caracteres).' });
  }
  if (!RE_EMAIL.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (codigo !== CODIGO_OFICINA) {
    return res.status(403).json({ erro: 'Código da oficina inválido.' });
  }

  res.status(201).json(criarEquipe(nome, email));
});

app.get('/api/equipes/:id', (req, res) => {
  const equipe = buscarEquipe(req.params.id);
  if (!equipe) return res.status(404).json({ erro: 'Equipe não encontrada.' });
  res.json({ equipe, historico: historico(equipe.id) });
});

app.post('/api/equipes/:id/submissoes', async (req, res) => {
  const equipe = buscarEquipe(req.params.id);
  if (!equipe) return res.status(404).json({ erro: 'Equipe não encontrada.' });

  const texto = String(req.body?.texto ?? '').trim();
  if (texto.length < MIN_CARACTERES) {
    return res.status(400).json({
      erro: `O problema de pesquisa precisa ter ao menos ${MIN_CARACTERES} caracteres. Escreva o enunciado completo, não apenas o tema.`,
    });
  }
  if (texto.length > MAX_CARACTERES) {
    return res
      .status(400)
      .json({ erro: `Texto muito longo (limite de ${MAX_CARACTERES} caracteres).` });
  }

  const desde = Date.now() - (ultimoEnvio.get(equipe.id) ?? 0);
  if (desde < INTERVALO_MIN_MS) {
    return res.status(429).json({ erro: 'Aguarde alguns segundos antes de reenviar.' });
  }
  ultimoEnvio.set(equipe.id, Date.now());

  try {
    const anterior = ultimaSubmissao(equipe.id);
    const versao = (anterior?.versao ?? 0) + 1;

    const resultado = await avaliar({ texto, versao, anterior });

    // Nota e diff são calculados aqui, em código — nunca pelo modelo.
    const resumo = calcularNota(resultado.avaliacoes);
    const diff = compararVersoes(anterior?.avaliacoes ?? null, resultado.avaliacoes);
    const delta = anterior ? Math.round((resumo.nota - anterior.nota) * 10) / 10 : null;

    salvarSubmissao({
      equipeId: equipe.id,
      versao,
      texto,
      resumo,
      avaliacoes: resultado.avaliacoes,
      diff,
    });

    res.json({
      versao,
      texto,
      resumo,
      delta_nota: delta,
      nota_anterior: anterior?.nota ?? null,
      avaliacoes: resultado.avaliacoes,
      diff,
      erros_novos: resultado.erros_novos,
      comentario_geral: resultado.comentario_geral,
    });
  } catch (err) {
    ultimoEnvio.delete(equipe.id); // falha nossa não deve custar a vez do participante
    console.error('[avaliacao] falhou:', err.message);
    res.status(502).json({
      erro: 'Não foi possível avaliar agora. Tente novamente em alguns segundos.',
      detalhe: err.message,
    });
  }
});

app.get('/api/ranking', (_req, res) => {
  res.json({ ranking: ranking() });
});

/**
 * Zera as submissões — para reaproveitar a instância entre turmas.
 * Exige ADMIN_TOKEN; sem a variável configurada, a rota fica desligada.
 */
app.post('/api/admin/reset', (req, res) => {
  const esperado = process.env.ADMIN_TOKEN;
  if (!esperado) return res.status(404).json({ erro: 'Rota desativada.' });
  if (req.get('x-admin-token') !== esperado) {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
  const apagados = limparTudo();
  console.log(`[admin] reset executado: ${apagados.submissoes} submissões, ${apagados.equipes} equipes`);
  res.json({ ok: true, ...apagados });
});

app.listen(PORTA, '0.0.0.0', () => {
  console.log(`[oficina-avaliador] ouvindo na porta ${PORTA}`);
  console.log(`[oficina-avaliador] modelo: ${process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'}`);
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn('[oficina-avaliador] ATENÇÃO: DEEPSEEK_API_KEY não configurada.');
  }
});
