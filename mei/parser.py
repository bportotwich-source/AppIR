"""Leitura do extrato PDF do Nubank PJ.

O layout real ainda não foi validado: este parser é heurístico e será
ajustado quando chegar um PDF de exemplo. A extração de texto
(pdfplumber) fica separada da interpretação das linhas (parse_linhas),
para dar pra testar sem PDF.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

MESES = {
    "JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12,
}

RE_DATA = re.compile(
    r"^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\b\s*(.*)$", re.I
)
RE_VALOR_FINAL = re.compile(r"^(.*?)\s*([+-])?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$")
RE_TOTAL_ENTRADAS = re.compile(r"total de entradas", re.I)
RE_TOTAL_SAIDAS = re.compile(r"total de sa[ií]das", re.I)
# Cabeçalho/rodapé que não é movimentação.
RE_IGNORAR = re.compile(
    r"saldo (inicial|final|do dia|anterior)|rendimento l[ií]quido|movimenta[çc][õo]es|"
    r"extrato gerado|ouvidoria|p[áa]gina \d+|cnpj|ag[êe]ncia|conta\b|valores em r\$",
    re.I,
)
PALAVRAS_ENTRADA = re.compile(r"recebid|dep[óo]sito|estorno|reembolso", re.I)
PALAVRAS_SAIDA = re.compile(r"enviad|pagamento|compra|d[ée]bito|tarifa|saque", re.I)


@dataclass
class Movimentacao:
    data: date
    descricao: str
    valor: float  # sempre positivo
    tipo: str  # "entrada" ou "saida"


def valor_br(texto: str) -> float:
    return float(texto.replace(".", "").replace(",", "."))


def parse_linhas(linhas: list[str]) -> list[Movimentacao]:
    movs: list[Movimentacao] = []
    data_atual: date | None = None
    secao: str | None = None  # definida pelos "Total de entradas/saídas"
    pendente: list[str] = []  # texto que veio antes do valor

    for bruta in linhas:
        linha = " ".join(bruta.split())
        if not linha:
            continue

        m = RE_DATA.match(linha)
        if m:
            dia, mes, ano, resto = m.groups()
            data_atual = date(int(ano), MESES[mes.upper()], int(dia))
            secao, pendente = None, []
            linha = resto.strip()
            if not linha:
                continue

        if RE_TOTAL_ENTRADAS.search(linha):
            secao, pendente = "entrada", []
            continue
        if RE_TOTAL_SAIDAS.search(linha):
            secao, pendente = "saida", []
            continue
        if data_atual is None or RE_IGNORAR.search(linha):
            continue

        mv = RE_VALOR_FINAL.match(linha)
        if not mv:
            pendente.append(linha)
            continue

        desc, sinal, valor = mv.groups()
        desc = " ".join([*pendente, desc]).strip()
        pendente = []
        if not desc:
            continue

        if sinal == "+":
            tipo = "entrada"
        elif sinal == "-":
            tipo = "saida"
        elif secao:
            tipo = secao
        elif PALAVRAS_ENTRADA.search(desc):
            tipo = "entrada"
        else:
            tipo = "saida"  # na dúvida, não conta como faturamento

        movs.append(Movimentacao(data_atual, desc, valor_br(valor), tipo))

    return movs


def extrair_texto(caminho: str | Path) -> list[str]:
    import pdfplumber

    linhas: list[str] = []
    with pdfplumber.open(caminho) as pdf:
        for pagina in pdf.pages:
            linhas.extend((pagina.extract_text() or "").splitlines())
    return linhas


def ler_extrato(caminho: str | Path) -> list[Movimentacao]:
    return parse_linhas(extrair_texto(caminho))
