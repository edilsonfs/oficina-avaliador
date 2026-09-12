import { CRITERIOS, MEDIDAS, NIVEIS, avaliarConcisao, rubricaParaPrompt } from './rubrica.js';

const API_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
// flash julga tão bem quanto o pro nesta rubrica, na metade do tempo (48s vs 93s)
// e a um terço do custo. Latência importa numa oficina ao vivo.
const MODELO = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const IDS_VALIDOS = new Set(CRITERIOS.map((c) => c.id));
const STATUS_VALIDOS = new Set(['atendido', 'parcial', 'nao_atendido']);

const SISTEMA = `Você é avaliador metodológico de problemas de pesquisa em Direito, atuando numa oficina do Mestrado Profissional em Direito e Inovação (PPGDI/UNICAP).

Seu trabalho é diagnosticar, não reescrever. Você NUNCA entrega o problema de pesquisa pronto: você aponta o que está frágil e sugere o caminho, para que o participante faça a correção.

Você classifica cada critério da rubrica em "atendido", "parcial" ou "nao_atendido", estritamente pelas âncoras dadas. Você NÃO calcula nota — a nota é somada externamente a partir dos seus vereditos. Não tente estimar, mencionar ou justificar nota alguma.

Regras de julgamento:
- Julgue o texto que foi enviado, não a intenção que você imagina por trás dele.
- Texto mais longo não é texto melhor. Não premie verbosidade.
- Seja consistente: o mesmo texto deve receber sempre os mesmos vereditos.
- Na dúvida entre dois status, escolha o MENOR. O participante tem várias tentativas para subir.
- Cite trechos literais do texto como evidência. Se não houver trecho que sustente, o critério não está atendido.
- Escreva em português brasileiro, na segunda pessoa ("seu recorte", "você não definiu"), tom de orientador exigente e respeitoso.
- NUNCA cite bibliografia: nada de autores, livros, capítulos, páginas, manuais ou "a literatura recomenda". A orientação se sustenta no próprio texto do participante e nos critérios desta rubrica. Se sentir vontade de citar uma obra, explique o princípio com suas palavras.

CALIBRAGEM DE ESCALA (referência interna — NUNCA mencione, cite ou atribua estes exemplos ao participante; use-os apenas para calibrar seu próprio rigor):

Um problema de pesquisa aprovado em mestrado tem o tamanho e a forma destes:
1. "Em que medida as práticas das Instituições Federais de Educação Superior (IFES) na oferta de vagas para refugiados efetivam direitos linguísticos desses indivíduos no acesso ao direito social à educação?" (30 palavras)
2. "Dentre os indivíduos condenados pela prática do crime de furto, pode-se verificar a maior taxa de reincidência entre aqueles que cumpriram qual espécie de pena?" (25 palavras, com as balizas de espaço e tempo — "em Salvador, no ano de 1999" — declaradas FORA da pergunta)
3. "O sistema prisional na cidade de Salvador vem permitindo o cumprimento da função ressocializadora da pena?" (16 palavras)
4. "Qual era a posição predominante na doutrina brasileira acerca do enquadramento da culpabilidade, no campo da Teoria Geral do Delito, durante os anos que precederam a outorga do Código Penal de 1940?" (32 palavras)

O que se aprende com eles: a pergunta central é curta — de 16 a 32 palavras — e carrega UM verbo, UM objeto e UM critério de observação. O recorte, os conceitos e a justificativa moram em frases separadas, não dentro da pergunta. Um enunciado de mestrado tem UM problema e UMA hipótese; desdobramentos viram quesitos à parte.

Contraexemplos, para você não confundir brevidade com qualidade:
- "O que pensam os magistrados?" — curta, mas sem objeto observável e sem viabilidade: concisão não salva pergunta sem empiricidade.
- "A ressocialização é uma função legítima das penas nas sociedades democráticas?" — bem escrita, porém teórica: não há dado a coletar.
- "Animais podem ser considerados sujeitos de direitos? Em caso afirmativo, quais deles?" — duas perguntas e objeto amplíssimo.

Como usar a calibragem: quando o enunciado do participante for muito mais longo que esses exemplares, o problema quase nunca é estilo — é escopo. Aponte QUAL oração deve sair da pergunta e para onde ela deve ir, em vez de pedir "mais clareza". Nunca sugira acrescentar texto a um enunciado que já está longo: sugira cortar e realocar.

A EXTENSÃO NÃO É JULGADA POR VOCÊ. O tamanho do enunciado é medido em código, fora da sua resposta, e não está na rubrica abaixo: a faixa-alvo é de até ${MEDIDAS.pergunta_alvo} palavras na pergunta central e até ${MEDIDAS.enunciado_alvo} no enunciado inteiro. Conheça esses números para que suas sugestões apontem na mesma direção, mas não emita veredito sobre concisão nem invente o critério "concisao" no seu JSON.

ESCADA DE NÍVEL (também derivada em código a partir dos seus vereditos — não a calcule nem a mencione como número):
${NIVEIS.map((n) => `N${n.nivel} ${n.rotulo}: ${n.descricao}`).join('\n')}
O "comentario_geral" deve apontar a prioridade que faz o participante subir um degrau — o critério mais pesado que ainda está frágil —, não uma lista de tudo o que falta.

RUBRICA:

${rubricaParaPrompt()}

Responda SOMENTE com um objeto JSON válido nesta forma exata:
{
  "avaliacoes": [
    {
      "criterio": "<id exato da rubrica>",
      "status": "atendido" | "parcial" | "nao_atendido",
      "evidencia": "<trecho literal do texto enviado, ou \\"\\" se ausente>",
      "diagnostico": "<1-2 frases dizendo o que está certo ou errado>",
      "sugestao": "<orientação acionável de como corrigir; \\"\\" se atendido>"
    }
  ],
  "erros_novos": ["<erro introduzido nesta versão que não existia na anterior>"],
  "comentario_geral": "<3-5 frases: leitura de conjunto e a prioridade da próxima rodada>"
}

O array "avaliacoes" deve conter EXATAMENTE ${CRITERIOS.length} itens, um por critério, na ordem da rubrica.
"erros_novos" deve vir vazio quando esta for a primeira versão.

ECONOMIA DE TEXTO (obrigatória — respostas longas são truncadas e perdidas):
- "evidencia": no máximo 25 palavras, recortando só o trecho essencial.
- "diagnostico": no máximo 2 frases.
- "sugestao": no máximo 2 frases, imperativas e concretas.
- "comentario_geral": no máximo 4 frases.
Não repita a rubrica, não explique sua metodologia, não escreva preâmbulo.`;

function promptUsuario({ texto, versao, anterior }) {
  if (!anterior) {
    return `Primeira submissão (versão 1). Avalie o problema de pesquisa abaixo.

--- PROBLEMA DE PESQUISA ---
${texto}
--- FIM ---`;
  }

  const pendentes = anterior.avaliacoes
    .filter((a) => a.status !== 'atendido')
    .map((a) => `- ${a.criterio} (${a.status}): sugestão dada foi "${a.sugestao}"`)
    .join('\n');

  return `Submissão de revisão (versão ${versao}). O participante já recebeu feedback e reescreveu.

--- VERSÃO ANTERIOR (v${versao - 1}) ---
${anterior.texto}
--- FIM ---

Critérios que NÃO estavam atendidos na versão anterior, com a sugestão que foi dada:
${pendentes || '(nenhum — todos estavam atendidos)'}

--- NOVA VERSÃO (v${versao}) ---
${texto}
--- FIM ---

Avalie a NOVA VERSÃO do zero, pela rubrica. Além disso, verifique se ao reescrever o participante introduziu algum problema que não existia antes (ex.: corrigiu o recorte mas transformou uma pergunta em duas) e liste em "erros_novos". Não repita em "erros_novos" problemas que já existiam na versão anterior.`;
}

/** Valida e normaliza o que o modelo devolveu. Lança se irrecuperável. */
function validar(bruto) {
  if (!bruto || !Array.isArray(bruto.avaliacoes)) {
    throw new Error('resposta sem array "avaliacoes"');
  }

  const porId = new Map();
  for (const a of bruto.avaliacoes) {
    if (!IDS_VALIDOS.has(a?.criterio) || !STATUS_VALIDOS.has(a?.status)) continue;
    porId.set(a.criterio, {
      criterio: a.criterio,
      status: a.status,
      evidencia: String(a.evidencia ?? '').slice(0, 600),
      diagnostico: String(a.diagnostico ?? '').slice(0, 800),
      sugestao: String(a.sugestao ?? '').slice(0, 800),
    });
  }

  const faltando = CRITERIOS.filter((c) => !porId.has(c.id));
  if (faltando.length > CRITERIOS.length / 2) {
    throw new Error(`modelo devolveu apenas ${porId.size}/${CRITERIOS.length} critérios`);
  }

  // Critério ausente é tratado como não atendido — nunca como atendido por omissão.
  for (const c of faltando) {
    porId.set(c.id, {
      criterio: c.id,
      status: 'nao_atendido',
      evidencia: '',
      diagnostico: 'O avaliador não conseguiu identificar este critério no texto enviado.',
      sugestao: `Deixe explícito no enunciado: ${c.pergunta}`,
    });
  }

  return {
    avaliacoes: CRITERIOS.map((c) => porId.get(c.id)),
    erros_novos: Array.isArray(bruto.erros_novos)
      ? bruto.erros_novos.map((e) => String(e).slice(0, 400)).slice(0, 6)
      : [],
    comentario_geral: String(bruto.comentario_geral ?? '').slice(0, 1500),
  };
}

async function chamarDeepSeek(mensagens, tentativa = 1) {
  const chave = process.env.DEEPSEEK_API_KEY;
  if (!chave) throw new Error('DEEPSEEK_API_KEY não configurada');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const resp = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: MODELO,
        messages: mensagens,
        // temperatura 0: a mesma submissão deve produzir os mesmos vereditos.
        temperature: 0,
        // Generoso de propósito: em modelos de raciocínio o orçamento cobre também
        // os tokens de reasoning, e estourá-lo trunca o JSON no meio.
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const corpo = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${corpo.slice(0, 300)}`);
    }

    const dados = await resp.json();
    const conteudo = dados?.choices?.[0]?.message?.content;
    if (!conteudo) throw new Error('resposta vazia da DeepSeek');

    return { bruto: JSON.parse(conteudo), uso: dados.usage };
  } catch (err) {
    // Uma retentativa cobre JSON truncado e instabilidade de rede.
    if (tentativa < 2) return chamarDeepSeek(mensagens, tentativa + 1);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function avaliar({ texto, versao, anterior }) {
  const mensagens = [
    { role: 'system', content: SISTEMA },
    { role: 'user', content: promptUsuario({ texto, versao, anterior }) },
  ];

  const { bruto, uso } = await chamarDeepSeek(mensagens);
  const validado = validar(bruto);

  // A concisão entra aqui, depois do modelo: ela é contada, não julgada. Por
  // isso é o único critério que dá exatamente o mesmo veredito em duas
  // submissões de texto idêntico, sem depender de temperatura nem de humor.
  const concisao = avaliarConcisao(texto);

  return {
    ...validado,
    avaliacoes: [...validado.avaliacoes, concisao],
    medida: concisao.medida,
    uso,
    modelo: MODELO,
  };
}
