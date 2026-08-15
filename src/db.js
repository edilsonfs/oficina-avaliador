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

const agora = () => new Date().toISOString();

export function criarEquipe(nome) {
  const id = randomBytes(4).toString('hex');
  const criado_em = agora();
  db.prepare('INSERT INTO equipes (id, nome, criado_em) VALUES (?, ?, ?)').run(
    id,
    nome.trim().slice(0, 120),
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

export function salvarSubmissao({ equipeId, versao, texto, resumo, avaliacoes, diff }) {
  const info = db
    .prepare(
      `INSERT INTO submissoes
         (equipe_id, versao, texto, nota, bem_delimitado, avaliacao_json, resumo_json, diff_json, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      equipeId,
      versao,
      texto,
      resumo.nota,
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

function hidratar(row) {
  return {
    id: row.id,
    versao: row.versao,
    texto: row.texto,
    nota: row.nota,
    bem_delimitado: !!row.bem_delimitado,
    avaliacoes: JSON.parse(row.avaliacao_json),
    resumo: JSON.parse(row.resumo_json),
    diff: row.diff_json ? JSON.parse(row.diff_json) : null,
    criado_em: row.criado_em,
  };
}

export default db;
