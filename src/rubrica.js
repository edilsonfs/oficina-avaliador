/**
 * Rubrica de avaliação de problema de pesquisa.
 *
 * Ancorada nas três obras de metodologia da pesquisa empírica jurídica do grupo
 * de José Mário Wanderley Gomes Neto (Editora Vozes):
 *   - Estudos de Caso: manual para a pesquisa empírica qualitativa (2024)
 *   - Análise Qualitativa Comparativa: manual para a pesquisa empírica jurídica
 *   - O que nos dizem os dados? Introdução à pesquisa jurídica quantitativa (2023)
 *
 * Os pesos somam 100. A nota NUNCA é produzida pelo modelo: o modelo classifica
 * cada critério em atendido/parcial/nao_atendido e a nota é somada aqui, em
 * código. É isso que impede a nota de oscilar sem o texto ter mudado.
 */

export const VALOR_STATUS = {
  atendido: 1.0,
  parcial: 0.5,
  nao_atendido: 0.0,
};

export const CRITERIOS = [
  {
    id: 'empiricidade',
    titulo: 'Empiricidade',
    peso: 12,
    pergunta: 'A pergunta investiga fatos observáveis do mundo, e não apenas uma tese doutrinária?',
    fonte: 'Estudos de Caso, cap. 4, p. 48',
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
    peso: 12,
    pergunta: 'É UMA pergunta, ou há várias perguntas embutidas em uma só frase?',
    fonte: 'Estudos de Caso, cap. 4',
    ancoras: {
      atendido: 'Uma única pergunta central, com um único ponto de interrogação conceitual.',
      parcial: 'Uma pergunta principal com um apêndice que já é outra pergunta disfarçada.',
      nao_atendido:
        'Duas ou mais perguntas distintas (ex.: técnica + causal + teleológica) coladas por "e", "bem como", "além de".',
    },
  },
  {
    id: 'forma_interrogativa',
    titulo: 'Forma interrogativa e verbo',
    peso: 10,
    pergunta: 'Está formulada como pergunta, com verbo empírico em vez de modal projetivo?',
    fonte: 'Estudos de Caso, cap. 4, Tabela 5, p. 47',
    ancoras: {
      atendido:
        'Formulada como pergunta, com verbo que descreve processo observável ou efeito verificável: "como se dá", "de que modo", "qual o efeito de". ATENÇÃO: verbos de processo construtivo — "como pode ser desenhado", "como pode ser prototipado", "como se estrutura" — SÃO adequados em mestrado profissional, porque o processo de construção é ele próprio o objeto empírico observado. Não confunda com projeção de efeito.',
      parcial: 'É pergunta, mas o verbo central ainda é vago ou levemente projetivo.',
      nao_atendido:
        'Não é pergunta (é objetivo ou afirmação disfarçada), ou usa modal que PROJETA UM EFEITO ainda não verificado — "pode aprimorar", "poderia contribuir para", "é capaz de melhorar" — antecipando a resposta em vez de investigá-la.',
    },
  },
  {
    id: 'delimitacao_objeto',
    titulo: 'Delimitação do objeto',
    peso: 12,
    pergunta: 'Está claro e específico O QUE exatamente será investigado?',
    fonte: 'Estudos de Caso, cap. 1 e 4',
    ancoras: {
      atendido: 'O objeto é nomeado com precisão; um terceiro leria e saberia o que examinar.',
      parcial: 'O objeto é identificável, mas amplo demais para o prazo de uma dissertação.',
      nao_atendido: 'O objeto é genérico ("a inteligência artificial no Direito", "o Judiciário").',
    },
  },
  {
    id: 'recorte_espaco_tempo',
    titulo: 'Recorte espacial e temporal',
    peso: 10,
    pergunta: 'Está definido ONDE e QUANDO o fenômeno será observado?',
    fonte: 'Estudos de Caso, cap. 2; Análise Qualitativa Comparativa, cap. 2 (unidades de análise)',
    ancoras: {
      atendido: 'Instituição/jurisdição e janela temporal explícitas (ex.: TJPE, 2020-2025).',
      parcial: 'Um dos dois recortes está presente; o outro está implícito ou ausente.',
      nao_atendido: 'Nenhum recorte de lugar ou de tempo.',
    },
  },
  {
    id: 'operacionalizacao',
    titulo: 'Operacionalização dos conceitos',
    peso: 12,
    pergunta: 'Os conceitos-chave são definidos de forma observável/mensurável?',
    fonte: 'O que nos dizem os dados?, cap. 3 (variáveis e inter-relações)',
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
    peso: 10,
    pergunta: 'A forma da pergunta condiz com um método empírico viável?',
    fonte: 'Estudos de Caso, cap. 4, Tabela 5; AQC, cap. 1; O que nos dizem os dados?, cap. 2',
    ancoras: {
      atendido:
        'Há correspondência clara: "como/por quê" com poucos casos → estudo de caso; combinações de condições em 5-50 casos → QCA; efeito/frequência com N grande → quantitativa.',
      parcial:
        'A correspondência existe mas é ambígua, ou o N implícito não sustenta o método sugerido.',
      nao_atendido:
        'A pergunta pede um método que seus próprios termos inviabilizam (ex.: promete generalização estatística a partir de um único caso).',
    },
  },
  {
    id: 'viabilidade',
    titulo: 'Viabilidade',
    peso: 8,
    pergunta: 'É exequível com dados acessíveis no prazo de um mestrado?',
    fonte: 'Estudos de Caso, cap. 4',
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
    peso: 8,
    pergunta: 'O tema é atual e a resposta importa para alguém além do autor?',
    fonte: 'Estudos de Caso, cap. 3 e 4',
    ancoras: {
      atendido: 'Fenômeno presente, com impacto institucional, social ou acadêmico explicitado.',
      parcial: 'Relevância presumida mas não declarada no enunciado.',
      nao_atendido: 'Tema datado, esgotado, ou sem consequência prática ou teórica identificável.',
    },
  },
  {
    id: 'lacuna',
    titulo: 'Lacuna de conhecimento',
    peso: 6,
    pergunta: 'A pergunta ataca algo ainda não respondido?',
    fonte: 'Estudos de Caso, cap. 7 (estudo de caso exploratório)',
    ancoras: {
      atendido: 'Demarca o que já se sabe e o que falta saber.',
      parcial: 'Sugere novidade sem demarcar o estado da arte.',
      nao_atendido: 'A resposta já é consolidada na literatura ou a pergunta é retórica.',
    },
  },
];

export const PESO_TOTAL = CRITERIOS.reduce((s, c) => s + c.peso, 0); // 100

export const FAIXAS = [
  { min: 9.0, rotulo: 'Bem delimitado', classe: 'excelente' },
  { min: 7.5, rotulo: 'Quase lá', classe: 'bom' },
  { min: 5.0, rotulo: 'Precisa de ajustes', classe: 'medio' },
  { min: 0.0, rotulo: 'Requer reformulação', classe: 'baixo' },
];

/**
 * Calcula a nota a partir dos vereditos do modelo. Determinístico: mesmos
 * vereditos, mesma nota, sempre.
 */
export function calcularNota(avaliacoes) {
  const porId = new Map(avaliacoes.map((a) => [a.criterio, a]));
  let pontos = 0;

  for (const c of CRITERIOS) {
    const a = porId.get(c.id);
    pontos += (VALOR_STATUS[a?.status] ?? 0) * c.peso;
  }

  const nota = Math.round((pontos / PESO_TOTAL) * 100) / 10; // 0.0 a 10.0
  const faixa = FAIXAS.find((f) => nota >= f.min);

  const naoAtendidos = avaliacoes.filter((a) => a.status === 'nao_atendido').length;
  const parciais = avaliacoes.filter((a) => a.status === 'parcial').length;

  // "Bem delimitado" exige mais do que a nota: nenhum critério zerado.
  const bemDelimitado = nota >= 9.0 && naoAtendidos === 0 && parciais <= 1;

  return {
    nota,
    pontos: Math.round(pontos * 10) / 10,
    rotulo: faixa.rotulo,
    classe: faixa.classe,
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
  const ordem = { nao_atendido: 0, parcial: 1, atendido: 2 };
  const conquistas = [];
  const regressoes = [];
  const pendentes = [];

  for (const c of CRITERIOS) {
    const de = antes.get(c.id);
    const para = atual.find((a) => a.criterio === c.id)?.status;
    if (!de || !para) continue;

    if (ordem[para] > ordem[de]) conquistas.push({ criterio: c.id, titulo: c.titulo, de, para });
    else if (ordem[para] < ordem[de]) regressoes.push({ criterio: c.id, titulo: c.titulo, de, para });
    else if (para !== 'atendido') pendentes.push({ criterio: c.id, titulo: c.titulo, status: para });
  }

  return { conquistas, regressoes, pendentes };
}

/** Bloco de rubrica injetado no prompt do modelo. */
export function rubricaParaPrompt() {
  return CRITERIOS.map(
    (c) => `### ${c.id} — ${c.titulo} (peso ${c.peso})
Pergunta do avaliador: ${c.pergunta}
Referência: ${c.fonte}
- atendido: ${c.ancoras.atendido}
- parcial: ${c.ancoras.parcial}
- nao_atendido: ${c.ancoras.nao_atendido}`
  ).join('\n\n');
}
