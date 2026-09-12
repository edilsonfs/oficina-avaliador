/**
 * Rubrica de avaliação de problema de pesquisa.
 *
 * A rubrica é autossuficiente: cada critério traz a pergunta do avaliador e as
 * âncoras que definem cada status. Nenhuma referência bibliográfica é citada —
 * a orientação é dada em termos do próprio texto do participante.
 *
 * Os pesos somam 100. A nota NUNCA é produzida pelo modelo: o modelo classifica
 * cada critério em atendido/parcial/nao_atendido e a nota é somada aqui, em
 * código. É isso que impede a nota de oscilar sem o texto ter mudado.
 *
 * Dois julgamentos são feitos INTEIRAMENTE em código, sem passar pelo modelo:
 * a concisão do enunciado (medida em palavras e frases) e o nível de análise
 * (derivado dos vereditos por portões explícitos). Ambos, por construção, não
 * oscilam entre submissões idênticas.
 */

export const VALOR_STATUS = {
  atendido: 1.0,
  parcial: 0.5,
  nao_atendido: 0.0,
};

/** Ordem dos status, para comparar "melhorou" e "regrediu". */
const ORDEM_STATUS = { nao_atendido: 0, parcial: 1, atendido: 2 };

/* ------------------------------------------------------------------ *
 * Critérios julgados pelo modelo
 * ------------------------------------------------------------------ */

export const CRITERIOS = [
  {
    id: 'empiricidade',
    titulo: 'Empiricidade',
    peso: 11,
    pergunta: 'A pergunta investiga fatos observáveis do mundo, e não apenas uma tese doutrinária?',
    ancoras: {
      atendido:
        'Investiga fatos institucionais, comportamentos, decisões ou processos observáveis. Existe algo no mundo a ser coletado e analisado.',
      parcial:
        'Mistura dimensão empírica com discussão dogmática, sem deixar claro qual é o dado a ser observado.',
      nao_atendido:
        'É pergunta puramente teórica, dogmática ou normativa ("o que deveria ser"), sem objeto empírico observável.',
    },
  },
  {
    id: 'unicidade',
    titulo: 'Pergunta única',
    peso: 11,
    pergunta: 'É UMA pergunta, ou há várias perguntas embutidas em uma só frase?',
    ancoras: {
      atendido:
        'Uma única pergunta central, com um único ponto de interrogação conceitual. Desdobramentos, se existirem, aparecem como itens à parte — não colados dentro da pergunta.',
      parcial: 'Uma pergunta principal com um apêndice que já é outra pergunta disfarçada.',
      nao_atendido:
        'Duas ou mais perguntas distintas (ex.: técnica + causal + teleológica) coladas por "e", "bem como", "além de".',
    },
  },
  {
    id: 'forma_interrogativa',
    titulo: 'Forma interrogativa e verbo',
    peso: 9,
    pergunta: 'Está formulada como pergunta, com verbo empírico em vez de modal projetivo?',
    ancoras: {
      atendido:
        'Formulada como pergunta, com verbo que descreve processo observável ou efeito verificável: "como se dá", "de que modo", "em que medida", "qual o efeito de". ATENÇÃO: verbos de processo construtivo — "como pode ser desenhado", "como pode ser prototipado", "como se estrutura" — SÃO adequados em mestrado profissional, porque o processo de construção é ele próprio o objeto empírico observado. Não confunda com projeção de efeito.',
      parcial: 'É pergunta, mas o verbo central ainda é vago ou levemente projetivo.',
      nao_atendido:
        'Não é pergunta (é objetivo ou afirmação disfarçada), ou usa modal que PROJETA UM EFEITO ainda não verificado — "pode aprimorar", "poderia contribuir para", "é capaz de melhorar" — antecipando a resposta em vez de investigá-la.',
    },
  },
  {
    id: 'delimitacao_objeto',
    titulo: 'Delimitação do objeto',
    peso: 11,
    pergunta: 'Está claro e específico O QUE exatamente será investigado?',
    ancoras: {
      atendido: 'O objeto é nomeado com precisão; um terceiro leria e saberia o que examinar.',
      parcial: 'O objeto é identificável, mas amplo demais para o prazo de uma dissertação.',
      nao_atendido: 'O objeto é genérico ("a inteligência artificial no Direito", "o Judiciário").',
    },
  },
  {
    id: 'recorte_espaco_tempo',
    titulo: 'Recorte espacial e temporal',
    peso: 9,
    pergunta: 'Está definido ONDE e QUANDO o fenômeno será observado?',
    ancoras: {
      atendido: 'Instituição/jurisdição e janela temporal explícitas (ex.: TJPE, 2020-2025).',
      parcial: 'Um dos dois recortes está presente; o outro está implícito ou ausente.',
      nao_atendido: 'Nenhum recorte de lugar ou de tempo.',
    },
  },
  {
    id: 'operacionalizacao',
    titulo: 'Operacionalização dos conceitos',
    peso: 11,
    pergunta: 'Os conceitos-chave são definidos de forma observável/mensurável?',
    ancoras: {
      atendido: 'Cada conceito central tem indicação de como será reconhecido nos dados.',
      parcial:
        'Parte dos conceitos está operacionalizada; outros permanecem como palavras-guarda-chuva.',
      nao_atendido:
        'Conceitos-fim vagos e não operacionalizados (ex.: "efetividade", "segurança jurídica", "coerência") usados como se fossem autoexplicativos.',
    },
  },
  {
    id: 'adequacao_metodo',
    titulo: 'Adequação ao método',
    peso: 9,
    pergunta: 'A forma da pergunta condiz com um método empírico viável?',
    ancoras: {
      atendido:
        'Há correspondência clara: "como/por quê" com poucos casos pede investigação qualitativa em profundidade; combinações de condições em algumas dezenas de casos pedem análise comparativa; medida de efeito ou frequência com muitos casos pede tratamento quantitativo.',
      parcial:
        'A correspondência existe mas é ambígua, ou o número de casos implícito não sustenta o método sugerido.',
      nao_atendido:
        'A pergunta pede um método que seus próprios termos inviabilizam (ex.: promete generalização estatística a partir de um único caso).',
    },
  },
  {
    id: 'viabilidade',
    titulo: 'Viabilidade',
    peso: 7,
    pergunta: 'É exequível com dados acessíveis no prazo de um mestrado?',
    ancoras: {
      atendido: 'Os dados existem, são acessíveis e o escopo cabe no prazo.',
      parcial: 'Viável, mas depende de acesso institucional ou dado ainda não garantido.',
      nao_atendido:
        'Exige dados inacessíveis, sigilosos sem autorização, ou escopo impossível no prazo.',
    },
  },
  {
    id: 'relevancia',
    titulo: 'Relevância e contemporaneidade',
    peso: 7,
    pergunta: 'O tema é atual e a resposta importa para alguém além do autor?',
    ancoras: {
      atendido: 'Fenômeno presente, com impacto institucional, social ou acadêmico explicitado.',
      parcial: 'Relevância presumida mas não declarada no enunciado.',
      nao_atendido: 'Tema datado, esgotado, ou sem consequência prática ou teórica identificável.',
    },
  },
  {
    id: 'lacuna',
    titulo: 'Lacuna de conhecimento',
    peso: 5,
    pergunta: 'A pergunta ataca algo ainda não respondido?',
    ancoras: {
      atendido: 'Demarca o que já se sabe e o que falta saber.',
      parcial: 'Sugere novidade sem demarcar o estado da arte.',
      nao_atendido: 'A resposta já é consolidada na literatura ou a pergunta é retórica.',
    },
  },
];

/* ------------------------------------------------------------------ *
 * Concisão — critério MEDIDO em código, não julgado pelo modelo
 * ------------------------------------------------------------------ */

/**
 * Faixa-alvo de extensão.
 *
 * Calibrada em problemas de pesquisa modelares e aprovados, não por palpite: o
 * problema-modelo do manual de projeto de pesquisa do PPGD/UFPEL tem 30
 * palavras; os exemplos de problema empírico bem formulado na literatura de
 * metodologia jurídica ficam entre 16 e 32 palavras, sempre com as balizas de
 * espaço e tempo declaradas FORA da pergunta; a FGV Direito SP exige uma
 * questão central única, com os desdobramentos em até seis quesitos separados.
 *
 * O limite é mais generoso que os exemplares (40, não 32) porque em Direito
 * nomes de instituições e de diplomas legais consomem palavras sem tornar a
 * pergunta vaga — "Instituições Federais de Educação Superior (IFES)" são cinco
 * palavras que deixam a pergunta MAIS precisa, não menos.
 */
export const MEDIDAS = {
  pergunta_alvo: 40, // palavras na pergunta central
  pergunta_limite: 55,
  enunciado_alvo: 110, // palavras no enunciado inteiro (pergunta + delimitação)
  enunciado_limite: 160,
};

/**
 * Emendas que alongam a pergunta sem delimitá-la. Duas ou mais indicam que o
 * participante está empilhando quesitos dentro da pergunta central.
 */
const RE_EMENDAS =
  /\b(bem como|assim como|bem assim|além disso|além de|ou ainda|e ainda|a fim de|de modo a|de forma a|com vistas a|no sentido de|visando|buscando)\b/gi;

export const CRITERIO_CONCISAO = {
  id: 'concisao',
  titulo: 'Concisão do enunciado',
  peso: 10,
  medido: true,
  pergunta: 'A pergunta central cabe numa frase enxuta, com a delimitação em frases separadas?',
  ancoras: {
    atendido: `Pergunta central com até ${MEDIDAS.pergunta_alvo} palavras e enunciado inteiro com até ${MEDIDAS.enunciado_alvo}, no tamanho dos problemas de pesquisa aprovados em mestrado.`,
    parcial: `A pergunta passou de ${MEDIDAS.pergunta_alvo} palavras, ou o enunciado inteiro está numa única frase, ou há emendas empilhando quesitos dentro da pergunta.`,
    nao_atendido: `A pergunta central passou de ${MEDIDAS.pergunta_limite} palavras ou o enunciado passou de ${MEDIDAS.enunciado_limite} — deixou de ser um problema de pesquisa e virou um parágrafo de projeto.`,
  },
};

/** Todos os critérios que entram na nota — os 10 do modelo mais a concisão. */
export const TODOS_CRITERIOS = [...CRITERIOS, CRITERIO_CONCISAO];

export const PESO_TOTAL = TODOS_CRITERIOS.reduce((s, c) => s + c.peso, 0); // 100

const contarPalavras = (s) => (String(s).match(/\S+/g) ?? []).length;

/**
 * Mede o enunciado. Só contagem — nenhum juízo aqui.
 *
 * A "pergunta central" é a frase interrogativa mais longa: é justamente ela que
 * cresce quando o participante tenta atender a todos os critérios de uma vez.
 * Quando não há nenhuma interrogativa, o texto inteiro é tratado como a
 * pergunta — quem escreveu um objetivo em lugar de uma pergunta não escapa da
 * medida por isso.
 */
export function medirTexto(texto) {
  const t = String(texto ?? '').trim();
  const frases = t
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
  const interrogativas = frases.filter((f) => f.includes('?'));

  const central = interrogativas.length
    ? interrogativas.reduce((a, b) => (contarPalavras(b) > contarPalavras(a) ? b : a))
    : t;

  return {
    palavras: contarPalavras(t),
    caracteres: t.length,
    frases: frases.length,
    perguntas: (t.match(/\?/g) ?? []).length,
    palavras_pergunta: contarPalavras(central),
    emendas: (central.match(RE_EMENDAS) ?? []).length,
    pergunta_central: central,
  };
}

/**
 * Julga a concisão a partir da medida. Determinístico por construção: o mesmo
 * texto produz sempre o mesmo veredito, sem chamar o modelo.
 */
export function avaliarConcisao(texto) {
  const m = medirTexto(texto);

  const estourou =
    m.palavras_pergunta > MEDIDAS.pergunta_limite || m.palavras > MEDIDAS.enunciado_limite;
  const acimaDoAlvo =
    m.palavras_pergunta > MEDIDAS.pergunta_alvo ||
    m.palavras > MEDIDAS.enunciado_alvo ||
    m.perguntas > 1 ||
    m.emendas >= 2 ||
    (m.frases === 1 && m.palavras > MEDIDAS.pergunta_alvo);

  const status = estourou ? 'nao_atendido' : acimaDoAlvo ? 'parcial' : 'atendido';

  const motivos = [];
  if (m.palavras_pergunta > MEDIDAS.pergunta_alvo) {
    motivos.push(
      `a pergunta central tem ${m.palavras_pergunta} palavras (o alvo é até ${MEDIDAS.pergunta_alvo})`
    );
  }
  if (m.palavras > MEDIDAS.enunciado_alvo) {
    motivos.push(
      `o enunciado inteiro tem ${m.palavras} palavras (o alvo é até ${MEDIDAS.enunciado_alvo})`
    );
  }
  if (m.frases === 1 && m.palavras > MEDIDAS.pergunta_alvo) {
    motivos.push('tudo está numa única frase, sem separar a pergunta da delimitação');
  }
  if (m.perguntas > 1) motivos.push(`há ${m.perguntas} pontos de interrogação`);
  if (m.emendas >= 2) {
    motivos.push(`há ${m.emendas} emendas do tipo "bem como", "além de", "a fim de"`);
  }

  const diagnostico =
    status === 'atendido'
      ? `Sua pergunta central tem ${m.palavras_pergunta} palavras e o enunciado inteiro, ${m.palavras} — dentro do tamanho dos problemas de pesquisa aprovados em mestrado.`
      : `Enunciado longo demais: ${motivos.join('; ')}.`;

  const sugestao =
    status === 'atendido'
      ? ''
      : 'Deixe na pergunta apenas o verbo, o objeto e o critério de observação. Mova o recorte de instituição e de período, a definição dos conceitos e a justificativa para uma ou duas frases separadas, depois da pergunta — corte, não acrescente.';

  return {
    criterio: CRITERIO_CONCISAO.id,
    status,
    evidencia: m.pergunta_central.split(/\s+/).slice(0, 25).join(' '),
    diagnostico,
    sugestao,
    medida: {
      palavras: m.palavras,
      frases: m.frases,
      perguntas: m.perguntas,
      palavras_pergunta: m.palavras_pergunta,
      emendas: m.emendas,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Nível de análise — escada de escopo, derivada dos vereditos
 * ------------------------------------------------------------------ */

/**
 * Os quatro degraus entre "tenho um assunto" e "tenho um problema de pesquisa".
 *
 * Cada nível declara só os portões que ELE acrescenta; `calcularNivel` acumula
 * os anteriores. O participante sobe um degrau quando todos os portões até ali
 * estão vencidos — e é por isso que o nível não oscila: ele é função dos
 * vereditos, e de nada mais.
 *
 * A escada existe porque enunciado extenso quase nunca é problema de escrita: é
 * sinal de que a pessoa ainda está no nível do tema e tenta compensar a falta
 * de recorte acrescentando orações.
 */
export const NIVEIS = [
  {
    nivel: 1,
    rotulo: 'Área temática',
    descricao: 'Você nomeou um assunto de interesse, mas ainda não um objeto investigável.',
    exige: [],
  },
  {
    nivel: 2,
    rotulo: 'Tema com foco',
    descricao: 'Há um objeto identificável e algo observável no mundo para examinar.',
    exige: [
      ['delimitacao_objeto', 'parcial'],
      ['empiricidade', 'parcial'],
    ],
  },
  {
    nivel: 3,
    rotulo: 'Recorte',
    descricao: 'O objeto está nomeado com precisão e você disse onde e quando vai observá-lo.',
    exige: [
      ['delimitacao_objeto', 'atendido'],
      ['recorte_espaco_tempo', 'atendido'],
    ],
  },
  {
    nivel: 4,
    rotulo: 'Problema pesquisável',
    descricao:
      'Uma pergunta só, enxuta, com conceitos observáveis e método viável: isto já é um problema de pesquisa.',
    exige: [
      ['unicidade', 'atendido'],
      ['forma_interrogativa', 'atendido'],
      ['operacionalizacao', 'atendido'],
      ['adequacao_metodo', 'atendido'],
      ['concisao', 'parcial'],
    ],
  },
];

const TITULOS = new Map(TODOS_CRITERIOS.map((c) => [c.id, c.titulo]));

/** Em que degrau o enunciado está, e o que exatamente trava a subida ao próximo. */
export function calcularNivel(avaliacoes) {
  const status = new Map(avaliacoes.map((a) => [a.criterio, a.status]));
  const vencido = ([id, minimo]) => (ORDEM_STATUS[status.get(id)] ?? 0) >= ORDEM_STATUS[minimo];

  let alcancado = NIVEIS[0];
  for (const n of NIVEIS) {
    if (n.exige.every(vencido)) alcancado = n;
    else break;
  }

  const proximo = NIVEIS.find((n) => n.nivel === alcancado.nivel + 1) ?? null;
  const faltando = proximo
    ? proximo.exige
        .filter((p) => !vencido(p))
        .map(([id, minimo]) => ({
          criterio: id,
          titulo: TITULOS.get(id) ?? id,
          status: status.get(id) ?? 'nao_atendido',
          minimo,
        }))
    : [];

  return {
    nivel: alcancado.nivel,
    rotulo: alcancado.rotulo,
    descricao: alcancado.descricao,
    total: NIVEIS.length,
    proximo: proximo ? { nivel: proximo.nivel, rotulo: proximo.rotulo } : null,
    faltando,
  };
}

/* ------------------------------------------------------------------ *
 * Nota
 * ------------------------------------------------------------------ */

// O rótulo da faixa descreve só a NOTA. Não use "Bem delimitado" aqui: esse é o
// veredito estrito (nota alta E nenhum critério zerado E nível 4), calculado à
// parte. Ter os dois com o mesmo nome fazia a mesma submissão aparecer como
// "Bem delimitado" no histórico e "Quase lá" na tabela.
export const FAIXAS = [
  { min: 9.0, rotulo: 'Excelente', classe: 'excelente' },
  { min: 7.5, rotulo: 'Quase lá', classe: 'bom' },
  { min: 5.0, rotulo: 'Precisa de ajustes', classe: 'medio' },
  { min: 0.0, rotulo: 'Requer reformulação', classe: 'baixo' },
];

/**
 * Calcula a nota e o nível a partir dos vereditos. Determinístico: mesmos
 * vereditos, mesma nota, sempre.
 */
export function calcularNota(avaliacoes) {
  const porId = new Map(avaliacoes.map((a) => [a.criterio, a]));
  let pontos = 0;

  for (const c of TODOS_CRITERIOS) {
    const a = porId.get(c.id);
    pontos += (VALOR_STATUS[a?.status] ?? 0) * c.peso;
  }

  const nota = Math.round((pontos / PESO_TOTAL) * 100) / 10; // 0.0 a 10.0
  const faixa = FAIXAS.find((f) => nota >= f.min);

  const naoAtendidos = avaliacoes.filter((a) => a.status === 'nao_atendido').length;
  const parciais = avaliacoes.filter((a) => a.status === 'parcial').length;
  const nivel = calcularNivel(avaliacoes);

  // "Bem delimitado" exige mais do que a nota: nenhum critério zerado e o
  // último degrau da escada alcançado. Um enunciado de nota alta que ainda não
  // chegou ao nível 4 não está pronto para ir ao orientador.
  const bemDelimitado = nota >= 9.0 && naoAtendidos === 0 && parciais <= 1 && nivel.nivel === 4;

  return {
    nota,
    pontos: Math.round(pontos * 10) / 10,
    rotulo: faixa.rotulo,
    classe: faixa.classe,
    nivel,
    bem_delimitado: bemDelimitado,
    total_atendidos: avaliacoes.filter((a) => a.status === 'atendido').length,
    total_parciais: parciais,
    total_nao_atendidos: naoAtendidos,
  };
}

/**
 * Compara duas avaliações e produz o diff de aderência às sugestões anteriores.
 * Também determinístico — o modelo não decide o que foi corrigido nem o que
 * regrediu; o código decide, comparando status.
 */
export function compararVersoes(anterior, atual) {
  if (!anterior) return null;

  const antes = new Map(anterior.map((a) => [a.criterio, a.status]));
  const conquistas = [];
  const regressoes = [];
  const pendentes = [];

  for (const c of TODOS_CRITERIOS) {
    const de = antes.get(c.id);
    const para = atual.find((a) => a.criterio === c.id)?.status;
    if (!de || !para) continue;

    if (ORDEM_STATUS[para] > ORDEM_STATUS[de]) {
      conquistas.push({ criterio: c.id, titulo: c.titulo, de, para });
    } else if (ORDEM_STATUS[para] < ORDEM_STATUS[de]) {
      regressoes.push({ criterio: c.id, titulo: c.titulo, de, para });
    } else if (para !== 'atendido') {
      pendentes.push({ criterio: c.id, titulo: c.titulo, status: para });
    }
  }

  return { conquistas, regressoes, pendentes };
}

/** Bloco de rubrica injetado no prompt do modelo — só o que o modelo julga. */
export function rubricaParaPrompt() {
  return CRITERIOS.map(
    (c) => `### ${c.id} — ${c.titulo} (peso ${c.peso})
Pergunta do avaliador: ${c.pergunta}
- atendido: ${c.ancoras.atendido}
- parcial: ${c.ancoras.parcial}
- nao_atendido: ${c.ancoras.nao_atendido}`
  ).join('\n\n');
}
