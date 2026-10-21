"""Totais de faturamento e alerta de limite do MEI."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass

LIMITE_ANUAL = 81_000.00
# Até 20% acima do limite o desenquadramento vale a partir do ano seguinte;
# acima disso, é retroativo a janeiro.
LIMITE_TOLERANCIA = LIMITE_ANUAL * 1.20


@dataclass
class Totais:
    servicos: float = 0.0
    comercio: float = 0.0

    @property
    def total(self) -> float:
        return self.servicos + self.comercio


def totais_por_mes(con: sqlite3.Connection, ano: int) -> dict[int, Totais]:
    meses = {m: Totais() for m in range(1, 13)}
    rows = con.execute(
        """SELECT CAST(substr(data, 6, 2) AS INTEGER) AS mes, categoria, SUM(valor) AS soma
           FROM movimentacoes
           WHERE tipo = 'entrada' AND faturamento = 1 AND data LIKE ?
           GROUP BY mes, categoria""",
        (f"{ano:04d}-%",),
    )
    for r in rows:
        # Faturamento sem categoria conta como serviço até ser classificado.
        attr = "comercio" if r["categoria"] == "comercio" else "servicos"
        setattr(meses[r["mes"]], attr, getattr(meses[r["mes"]], attr) + r["soma"])
    return meses


def totais_ano(con: sqlite3.Connection, ano: int) -> Totais:
    t = Totais()
    for m in totais_por_mes(con, ano).values():
        t.servicos += m.servicos
        t.comercio += m.comercio
    return t


def pendentes(con: sqlite3.Connection, ano: int) -> int:
    return con.execute(
        """SELECT COUNT(*) FROM movimentacoes
           WHERE tipo = 'entrada' AND data LIKE ?
             AND (faturamento IS NULL OR (faturamento = 1 AND categoria IS NULL))""",
        (f"{ano:04d}-%",),
    ).fetchone()[0]


def alerta(total: float, limite: float = LIMITE_ANUAL) -> tuple[str, str]:
    """Retorna (nível, mensagem). Níveis: ok, atencao, perigo, estourou, critico."""
    pct = total / limite * 100
    if total > limite * 1.20:
        return "critico", (
            f"Faturamento {pct:.0f}% do limite: passou de 20% acima de R$ 81 mil. "
            "O desenquadramento é retroativo a janeiro. Procure um contador."
        )
    if total > limite:
        return "estourou", (
            f"Faturamento {pct:.0f}% do limite. Até 20% acima, você paga DAS sobre o excesso "
            "e vira ME a partir do ano que vem."
        )
    if pct >= 90:
        return "perigo", f"Atenção: {pct:.0f}% do limite anual. Restam R$ {limite - total:,.2f}."
    if pct >= 70:
        return "atencao", f"{pct:.0f}% do limite anual usado. Restam R$ {limite - total:,.2f}."
    return "ok", f"{pct:.0f}% do limite anual usado."


def limite_proporcional(mes_abertura: int) -> float:
    """No ano de abertura, o limite é R$ 6.750 por mês de atividade."""
    return 6_750.00 * (13 - mes_abertura)
