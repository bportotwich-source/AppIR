import { useState } from 'react'
import type { TelaProps } from '../App'
import { brl } from '../core/relatorio'
import { dataCurta, lerValor } from '../core/formato'
import { apagarComprovante, compraLigada, comprimirImagem, comprovantes, guardarComprovante, mascararDoc, novoId, TIPOS_SAUDE, type Comprovante } from '../core/comprovantes'
import { primeiroNome, titularDo } from '../core/pf'
import { Cabecalho } from '../componentes/Pecas'

export default function ReciboSaude({ banco, mudar, ir, param }: TelaProps) {
  const existente = comprovantes(banco).find((c) => c.id === param)
  const titular = primeiroNome(titularDo(banco)) || 'Você'
  const [c, setC] = useState<Comprovante>(() => existente ?? {
    id: novoId(), tipo: 'saude', perfil: 'pf', loja: '', data: new Date().toLocaleDateString('sv-SE'), valor: 0, criadoEm: new Date().toISOString(),
    saude: { tipo: 'Consulta médica', prestador: '', doc: '', paciente: titular },
  })
  const [valorTexto, setValorTexto] = useState(c.valor ? c.valor.toFixed(2).replace('.', ',') : '')
  const [verDoc, setVerDoc] = useState(!banco.privacidade?.esconderDocs || !existente)
  const s = c.saude!
  const doc = s.doc.replace(/\D/g, '')
  const docOk = doc.length === 11 || doc.length === 14
  const mudarSaude = (parte: Partial<typeof s>) => setC({ ...c, saude: { ...s, ...parte }, loja: parte.prestador ?? c.loja })
  const ligada = compraLigada(banco, c)
  const pacientes = [...new Set([titular, ...comprovantes(banco).map((x) => x.saude?.paciente).filter((p): p is string => !!p)])]

  return (
    <main className="conteudo topo">
      <Cabecalho titulo="Recibo de saúde" sub="A Receita pede quem atendeu, o CPF ou CNPJ e quem foi o paciente." voltar={() => ir('irpf')} rotuloVoltar="Voltar para o Imposto de Renda" empilhado />

      <label className="arquivo-grande">
        <input type="file" accept="image/*,application/pdf" onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f && f.type.startsWith('image/')) setC({ ...c, imagem: await comprimirImagem(f) })
        }} />
        {c.imagem ? <img className="cupom-foto" src={c.imagem} alt="Foto do recibo" /> : <b>Foto do recibo</b>}
        <span>{c.imagem ? 'Trocar foto' : 'Opcional. Guarde o papel por 5 anos.'}</span>
      </label>

      <form className="folha-campos" onSubmit={(e) => {
        e.preventDefault()
        mudar(guardarComprovante(banco, { ...c, valor: lerValor(valorTexto) || 0 }))
        ir('irpf')
      }}>
        <label className="campo">Tipo
          <select value={s.tipo} onChange={(e) => mudarSaude({ tipo: e.target.value })}>
            {TIPOS_SAUDE.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="campo">Quem atendeu<input value={s.prestador} onChange={(e) => mudarSaude({ prestador: e.target.value })} placeholder="Nome do profissional ou da clínica" /></label>
        <label className="campo">CPF ou CNPJ de quem atendeu
          {verDoc ? (
            <input inputMode="numeric" value={s.doc} onChange={(e) => mudarSaude({ doc: e.target.value })} placeholder="000.000.000-00" aria-invalid={!!doc && !docOk} />
          ) : (
            <button type="button" className="botao sensivel" onClick={() => setVerDoc(true)}>{mascararDoc(s.doc) || 'Preencher'}</button>
          )}
        </label>
        {!docOk && <p className="aviso" role="status">Falta este dado. Costuma estar no rodapé do recibo.</p>}
        <label className="campo">Paciente
          <input list="pacientes" value={s.paciente} onChange={(e) => mudarSaude({ paciente: e.target.value })} />
          <datalist id="pacientes">{pacientes.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <div className="linha-dupla">
          <label className="campo">Data<input type="date" value={c.data} onChange={(e) => setC({ ...c, data: e.target.value })} /></label>
          <label className="campo">Valor<input inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} placeholder="0,00" /></label>
        </div>
        {ligada && <p className="apoio">Ligado ao Pix de {brl(ligada.valor)} em {dataCurta(ligada.data)}, conta {ligada.perfil === 'pf' ? 'pessoal' : 'da empresa'}.</p>}
        <button className="principal" disabled={!(lerValor(valorTexto) > 0) || !s.prestador.trim()}>Salvar recibo</button>
      </form>

      {existente && <button className="botao perigo" onClick={() => { if (confirm('Apagar este recibo?')) { mudar(apagarComprovante(banco, c.id)); ir('irpf') } }}>Apagar</button>}
      <p className="nota-ir">Guarde o papel por 5 anos. A foto fica no celular e no backup.</p>
    </main>
  )
}
