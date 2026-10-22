// Onde os dados vivem: o navegador pode apagar o IndexedDB de sites comuns
// quando falta espaço, e o Safari do iPhone apaga dados de sites que não
// estão na tela de início depois de alguns dias sem uso.

/** Pede ao navegador para não apagar os dados. Resolve true se ficaram protegidos. */
export async function protegerDados(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}

/** Aberto pelo ícone da tela de início, não pelo navegador. */
export function instalado(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

/** Vale mostrar o aviso de instalar: no iPhone, só a tela de início protege. */
export function dadosEmRisco(protegidos: boolean): boolean {
  if (instalado()) return false
  return ehIphone() || !protegidos
}
