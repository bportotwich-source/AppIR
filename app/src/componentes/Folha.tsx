import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

/** Folha que sobe do rodapé (dialog modal): prende o foco, fecha com Esc,
 * com Cancelar ou tocando fora. `children` recebe a função que fecha. */
export default function Folha({ etiqueta, titulo, fechar, enviar, children }: {
  etiqueta: string
  titulo: string
  fechar: () => void
  enviar?: () => void
  children: (fechar: () => void) => ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const fecharFolha = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className="folha"
      aria-labelledby="folha-t"
      onClose={fechar}
      // Tocar fora da folha fecha, como nas folhas do sistema.
      onClick={(e) => { if (e.target === e.currentTarget) fecharFolha() }}
    >
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); enviar?.() }}>
        <span className="folha-alca" aria-hidden="true" />
        <p className="folha-etiqueta">{etiqueta}</p>
        <h2 id="folha-t">{titulo}</h2>
        {children(fecharFolha)}
      </form>
    </dialog>
  )
}
