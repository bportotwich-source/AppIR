// Ícones de traço do design (24×24, cor do texto).

const CAMINHOS = {
  inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></>,
  revisar: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M7 5h10" /><path d="m9 14 2 2 4-4" /></>,
  importar: <><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M5 19h14" /></>,
  declaracao: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  extratos: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  seta: <path d="m9 6 6 6-6 6" />,
}

export default function Icone({ nome, tamanho = 22 }: { nome: keyof typeof CAMINHOS; tamanho?: number }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {CAMINHOS[nome]}
    </svg>
  )
}
