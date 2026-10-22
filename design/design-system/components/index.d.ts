/** Valor em reais formatado em pt-BR que conta até o número ao aparecer ou mudar. */
export interface AnimatedNumberProps {
  value: number;
  /** Texto antes do número. Padrão "R$ ". Use "" para contagens. */
  prefix?: string;
  suffix?: string;
  /** Casas decimais. Padrão 2. */
  decimals?: number;
  /** Duração da contagem em ms. Padrão 900. */
  duration?: number;
  style?: Record<string, string | number>;
  className?: string;
}

/** Arco de 240 graus com o faturamento do ano contra o limite do MEI. */
export interface LimitGaugeProps {
  value: number;
  /** Padrão 81000. */
  limit?: number;
  /** Fração em que vira atenção. Padrão 0.7. */
  warnAt?: number;
  /** Fração em que vira perigo. Padrão 0.9. */
  dangerAt?: number;
  /** Largura em px. Padrão 280. Altura = 80% da largura. */
  size?: number;
  /** "dark" sobre a faixa escura do topo; "light" sobre fundo claro. */
  tone?: "light" | "dark";
  /** Rótulo acima do valor. Padrão "Faturado no ano". */
  label?: string;
}

export interface MonthDatum { m?: string; s: number; c: number; }

/** Cápsulas empilhadas por mês (Serviços embaixo, Comércio em cima) com mês selecionável. */
export interface MonthBarsProps {
  /** Até 12 meses, janeiro primeiro. s = serviços, c = comércio. */
  data: MonthDatum[];
  /** Topo da escala. Padrão 9000. */
  max?: number;
  /** Linha tracejada. Padrão 6750. */
  avg?: number;
  /** Índice do mês aberto (0 = janeiro). Padrão: último mês com dados. */
  selected?: number;
}

export interface SplitItem { label: string; value: number; color?: string; }

/** Uma barra dividida entre categorias, com legenda, valor e percentual escritos. */
export interface SplitBarProps { items: SplitItem[]; }

export interface ReviewEntry { id?: string | number; date: string; value: number; payer: string; description: string; }
export interface ReviewDecision { entry: ReviewEntry; choice: "servicos" | "comercio" | "fora"; index?: number; }

/** Pilha de entradas novas: uma por vez, decidida com três botões grandes. */
export interface ReviewDeckProps {
  entries: ReviewEntry[];
  onDecide?: (d: ReviewDecision) => void;
  onUndo?: (d: ReviewDecision) => void;
  doneTitle?: string;
  doneText?: string;
}

/** Anel com um número no centro, para dias até um prazo. */
export interface CountdownRingProps {
  value: number;
  /** Valor que enche o anel. Padrão 365. */
  max?: number;
  /** Texto sob o número. Padrão "dias". */
  label?: string;
  /** Complemento lido por leitores de tela. */
  sub?: string;
  size?: number;
  tone?: "light" | "dark";
  color?: string;
}

/** Área de envio do PDF: anel girando, leitura com feixe e confirmação. */
export interface ScanDropProps {
  fileName?: string;
  /** Estado inicial. Padrão "idle". */
  state?: "idle" | "reading" | "done";
  doneText?: string;
  size?: number;
  onDone?: (r: { fileName?: string }) => void;
}

/** Curva do faturamento acumulado no ano, com limite, faixa de atenção e projeção até dezembro. */
export interface AccumulatedChartProps {
  data: MonthDatum[];
  /** Padrão 81000. */
  limit?: number;
  tone?: "light" | "dark";
  /** Rótulo acima do valor. Padrão "Faturado no ano". */
  label?: string;
}

/** O limite anual como barra de orçamento: um pedaço por mês, projeção listrada e folga. */
export interface LimitTrackProps {
  data: MonthDatum[];
  /** Padrão 81000. */
  limit?: number;
  tone?: "light" | "dark";
  label?: string;
}

/** O mês a mês em cinco formas: cápsulas, desvio da média, linha, faixa de calor e relógio do ano. */
export interface MonthChartProps {
  data: MonthDatum[];
  variant: "capsulas" | "desvio" | "linha" | "calor" | "relogio";
  /** Topo da escala. Padrão 9000. */
  max?: number;
  /** Média permitida por mês. Padrão 6750. */
  avg?: number;
  /** Índice do mês aberto (0 = janeiro). Padrão: último mês com dados. */
  selected?: number;
}
