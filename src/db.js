import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || './data';
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'oficina.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS equipes (
    id         TEXT PRIMARY KEY,
    nome       TEXT NOT NULL,
    criado_em  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissoes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    equipe_id       TEXT NOT NULL REFERENCES equipes(id),
    versao          INTEGER NOT NULL,
    texto           TEXT NOT NULL,
    nota            REAL NOT NULL,
    bem_delimitado  INTEGER NOT NULL DEFAULT 0,
    avaliacao_json  TEXT NOT NULL,
    resumo_json     TEXT NOT NULL,
    diff_json       TEXT,
    criado_em       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sub_equipe ON submissoes(equipe_id, versao);
`);

/**
 * Migrações idempotentes: as tabelas já existem em produção sem estas colunas,
 * e o banco vive num volume que não é recriado a cada deploy.
 */
function garantirColuna(tabela, coluna, definicao) {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
  if (!colunas.includes(coluna)) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${definicao}`);
}

garantirColuna('equipes', 'email', "email TEXT NOT NULL DEFAULT ''");
// Nível e palavras ganham coluna própria, e não só um campo dentro de
// resumo_json, para que o painel possa agregar a turma em SQL. Submissões
// anteriores à escada de nível ficam com 0 — o painel mostra "—" nesse caso,
// em vez de fingir que aquela submissão foi medida e ficou no N1.
garantirColuna('submissoes', 'nivel', 'nivel INTEGER NOT NULL DEFAULT 0');
garantirColuna('submissoes', 'palavras', 'palavras INTEGER NOT NULL DEFAULT 0');

const agora = () => new Date().toISOString();

export function criarEquipe(nome, email) {
  const id = randomBytes(4).toString('hex');
  const criado_em = agora();
  db.prepare('INSERT INTO equipes (id, nome, email, criado_em) VALUES (?, ?, ?, ?)').run(
    id,
    nome.trim().slice(0, 120),
    String(email ?? '').trim().toLowerCase().slice(0, 160),
    criado_em
  );
  return { id, nome: nome.trim(), criado_em };
}

export function buscarEquipe(id) {
  return db.prepare('SELECT * FROM equipes WHERE id = ?').get(id) ?? null;
}

/** Última submissão da equipe, já desserializada — é a base do diff. */
export function ultimaSubmissao(equipeId) {
  const row = db
    .prepare('SELECT * FROM submissoes WHERE equipe_id = ? ORDER BY versao DESC LIMIT 1')
    .get(equipeId);
  return row ? hidratar(row) : null;
}

export function salvarSubmissao({ equipeId, versao, texto, resumo, avaliacoes, diff, palavras }) {
  const info = db
    .prepare(
      `INSERT INTO submissoes
         (equipe_id, versao, texto, nota, nivel, palavras, bem_delimitado,
          avaliacao_json, resumo_json, diff_json, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      equipeId,
      versao,
      texto,
      resumo.nota,
      resumo.nivel?.nivel ?? 0,
      palavras ?? 0,
      resumo.bem_delimitado ? 1 : 0,
      JSON.stringify(avaliacoes),
      JSON.stringify(resumo),
      diff ? JSON.stringify(diff) : null,
      agora()
    );
  return Number(info.lastInsertRowid);
}

export function historico(equipeId) {
  return db
    .prepare('SELECT * FROM submissoes WHERE equipe_id = ? ORDER BY versao ASC')
    .all(equipeId)
    .map(hidratar);
}

/**
 * Ranking pela MELHOR nota já alcançada pela equipe — quem experimenta e piora
 * numa rodada não é punido por ter tentado.
 */
export function ranking() {
  return db
    .prepare(
      `SELECT e.nome,
              e.id                   AS equipe_id,
              MAX(s.nota)            AS melhor_nota,
              COUNT(s.id)            AS submissoes,
              MAX(s.bem_delimitado)  AS bem_delimitado,
              MAX(s.criado_em)       AS ultima_em
         FROM equipes e
         JOIN submissoes s ON s.equipe_id = e.id
        GROUP BY e.id
        ORDER BY melhor_nota DESC, submissoes ASC, ultima_em ASC`
    )
    .all()
    .map((r, i) => ({ ...r, posicao: i + 1, bem_delimitado: !!r.bem_delimitado }));
}

/**
 * Um registro por participante, com a trajetória completa: nota da primeira
 * versão, nota da última e o ganho entre elas. Inclui quem entrou e ainda não
 * submeteu nada (LEFT JOIN) — na oficina isso importa para saber quem travou.
 */
export function participantes() {
  return db
    .prepare(
      `SELECT e.id                AS equipe_id,
              e.nome,
              e.email,
              e.criado_em,
              COUNT(s.id)         AS versoes,
              MAX(s.nota)         AS melhor_nota,
              MIN(s.criado_em)    AS primeira_em,
              MAX(s.criado_em)    AS ultima_em,
              (SELECT nota FROM submissoes WHERE equipe_id = e.id ORDER BY versao ASC  LIMIT 1) AS nota_inicial,
              (SELECT nota FROM submissoes WHERE equipe_id = e.id ORDER BY versao DESC LIMIT 1) AS nota_final,
              (SELECT nivel FROM submissoes WHERE equipe_id = e.id ORDER BY versao DESC LIMIT 1) AS nivel_final,
              (SELECT palavras FROM submissoes WHERE equipe_id = e.id ORDER BY versao DESC LIMIT 1) AS palavras_final,
              (SELECT palavras FROM submissoes WHERE equipe_id = e.id ORDER BY versao ASC  LIMIT 1) AS palavras_inicial,
              (SELECT bem_delimitado FROM submissoes WHERE equipe_id = e.id ORDER BY versao DESC LIMIT 1) AS bem_delimitado
         FROM equipes e
         LEFT JOIN submissoes s ON s.equipe_id = e.id
        GROUP BY e.id
        ORDER BY (nota_final IS NULL), nota_final DESC, versoes DESC`
    )
    .all()
    .map((r, i) => ({
      ...r,
      posicao: i + 1,
      bem_delimitado: !!r.bem_delimitado,
      evolucao:
        r.nota_inicial === null || r.nota_final === null
          ? null
          : Math.round((r.nota_final - r.nota_inicial) * 10) / 10,
    }));
}

/** Agregados do dashboard. Médias só consideram quem de fato submeteu. */
export function estatisticas() {
  const lista = participantes().filter((p) => p.versoes > 0);
  const media = (xs) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

  const totalEquipes = db.prepare('SELECT COUNT(*) AS n FROM equipes').get().n;
  const totalSubmissoes = db.prepare('SELECT COUNT(*) AS n FROM submissoes').get().n;

  // Só quem foi avaliado pela escada entra na distribuição de níveis: turmas
  // anteriores gravaram nivel = 0 e contá-las como N1 inventaria um dado.
  const medidos = lista.filter((p) => p.nivel_final > 0);
  const distribuicao = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of medidos) distribuicao[p.nivel_final] += 1;

  return {
    total_participantes: totalEquipes,
    participantes_ativos: lista.length,
    sem_submissao: totalEquipes - lista.length,
    total_submissoes: totalSubmissoes,
    media_versoes: lista.length ? Math.round((totalSubmissoes / lista.length) * 10) / 10 : null,
    media_nota_inicial: media(lista.map((p) => p.nota_inicial)),
    media_nota_final: media(lista.map((p) => p.nota_final)),
    media_evolucao: media(lista.map((p) => p.evolucao)),
    bem_delimitados: lista.filter((p) => p.bem_delimitado).length,
    melhoraram: lista.filter((p) => p.evolucao > 0).length,
    pioraram: lista.filter((p) => p.evolucao < 0).length,
    // Extensão da turma: é o número que revela o enunciado crescendo rodada
    // após rodada, o sintoma que motivou a escada de nível.
    media_palavras_inicial: media(medidos.map((p) => p.palavras_inicial).filter((n) => n > 0)),
    media_palavras_final: media(medidos.map((p) => p.palavras_final).filter((n) => n > 0)),
    distribuicao_niveis: distribuicao,
    medidos: medidos.length,
    no_nivel_4: distribuicao[4],
  };
}

/** Apaga todas as submissões e equipes. Usado apenas pela rota de reset. */
export function limparTudo() {
  const submissoes = db.prepare('SELECT COUNT(*) AS n FROM submissoes').get().n;
  const equipes = db.prepare('SELECT COUNT(*) AS n FROM equipes').get().n;
  db.exec('DELETE FROM submissoes; DELETE FROM equipes;');
  return { submissoes, equipes };
}

function hidratar(row) {
  return {
    id: row.id,
    versao: row.versao,
    texto: row.texto,
    nota: row.nota,
    nivel: row.nivel ?? 0,
    palavras: row.palavras ?? 0,
    bem_delimitado: !!row.bem_delimitado,
    avaliacoes: JSON.parse(row.avaliacao_json),
    resumo: JSON.parse(row.resumo_json),
    diff: row.diff_json ? JSON.parse(row.diff_json) : null,
    criado_em: row.criado_em,
  };
}

export default db;
