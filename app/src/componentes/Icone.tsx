// Ícones de traço do design (24×24, cor do texto).

const CAMINHOS = {
  inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></>,
  revisar: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M7 5h10" /><path d="m9 14 2 2 4-4" /></>,
  importar: <><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M5 19h14" /></>,
  declaracao: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  extratos: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  seta: <path d="m9 6 6 6-6 6" />,
  mais: <path d="M12 5v14M5 12h14" />,
  notas: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></>,
  documento: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" /></>,
  coracao: <path d="M12 21s-7-4.5-9-9.5C1.5 7 4.5 4 8 4c2 0 3.2 1 4 2.2C12.8 5 14 4 16 4c3.5 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5z" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  ligar: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
}

export default function Icone({ nome, tamanho = 22 }: { nome: keyof typeof CAMINHOS; tamanho?: number }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {CAMINHOS[nome]}
    </svg>
  )
}
