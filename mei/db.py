"""Armazenamento local em SQLite."""

from __future__ import annotations

import hashlib
import re
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path

from .parser import Movimentacao

CAMINHO_PADRAO = Path(__file__).resolve().parent.parent / "dados" / "mei.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,              -- AAAA-MM-DD
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    faturamento INTEGER,             -- NULL = não revisado, 0 = não, 1 = sim
    categoria TEXT CHECK (categoria IN ('servicos', 'comercio')),
    arquivo TEXT,
    importado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Marcações lembradas por descrição normalizada.
CREATE TABLE IF NOT EXISTS regras (
    chave TEXT PRIMARY KEY,
    faturamento INTEGER NOT NULL,
    categoria TEXT
);
"""


def conectar(caminho: str | Path = CAMINHO_PADRAO) -> sqlite3.Connection:
    Path(caminho).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def chave_descricao(descricao: str) -> str:
    """Normaliza a descrição para casar movimentações parecidas.

    Remove acentos, números, CPF/CNPJ mascarados e pontuação, mantendo
    o tipo de operação e a contraparte.
    """
    s = unicodedata.normalize("NFKD", descricao).encode("ascii", "ignore").decode()
    s = s.lower()
    s = re.sub(r"[\d•*]+", " ", s)
    s = re.sub(r"[^a-z ]+", " ", s)
    return " ".join(s.split())


def _hash(m: Movimentacao, ocorrencia: int) -> str:
    base = f"{m.data.isoformat()}|{m.descricao}|{m.valor:.2f}|{m.tipo}|{ocorrencia}"
    return hashlib.sha256(base.encode()).hexdigest()


def importar(con: sqlite3.Connection, movs: list[Movimentacao], arquivo: str = "") -> tuple[int, int]:
    """Grava as movimentações, ignorando as já importadas.

    Retorna (novas, repetidas). Movimentações idênticas no mesmo dia são
    diferenciadas pela ordem em que aparecem no extrato.
    """
    vistos: Counter[tuple] = Counter()
    novas = 0
    for m in movs:
        ident = (m.data, m.descricao, m.valor, m.tipo)
        vistos[ident] += 1
        regra = None
        if m.tipo == "entrada":
            regra = con.execute(
                "SELECT faturamento, categoria FROM regras WHERE chave = ?",
                (chave_descricao(m.descricao),),
            ).fetchone()
        cur = con.execute(
            """INSERT OR IGNORE INTO movimentacoes
               (hash, data, descricao, valor, tipo, faturamento, categoria, arquivo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                _hash(m, vistos[ident]), m.data.isoformat(), m.descricao, m.valor, m.tipo,
                regra["faturamento"] if regra else (0 if m.tipo == "saida" else None),
                regra["categoria"] if regra else None,
                arquivo,
            ),
        )
        novas += cur.rowcount
    con.commit()
    return novas, len(movs) - novas


def marcar(con: sqlite3.Connection, mov_id: int, faturamento: bool, categoria: str | None,
           lembrar: bool = True) -> None:
    categoria = categoria if faturamento else None
    con.execute(
        "UPDATE movimentacoes SET faturamento = ?, categoria = ? WHERE id = ?",
        (int(faturamento), categoria, mov_id),
    )
    if lembrar:
        desc = con.execute("SELECT descricao FROM movimentacoes WHERE id = ?", (mov_id,)).fetchone()
        con.execute(
            "INSERT OR REPLACE INTO regras (chave, faturamento, categoria) VALUES (?, ?, ?)",
            (chave_descricao(desc["descricao"]), int(faturamento), categoria),
        )
    con.commit()


def entradas(con: sqlite3.Connection, ano: int, mes: int | None = None) -> list[sqlite3.Row]:
    filtro = f"{ano:04d}-{mes:02d}-%" if mes else f"{ano:04d}-%"
    return con.execute(
        "SELECT * FROM movimentacoes WHERE tipo = 'entrada' AND data LIKE ? ORDER BY data, id",
        (filtro,),
    ).fetchall()


def anos_disponiveis(con: sqlite3.Connection) -> list[int]:
    rows = con.execute("SELECT DISTINCT substr(data, 1, 4) AS a FROM movimentacoes ORDER BY a DESC")
    return [int(r["a"]) for r in rows]
