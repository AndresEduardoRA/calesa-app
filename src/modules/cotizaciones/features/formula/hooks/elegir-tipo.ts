// «Tipo de celda ›» del menú de una fila (D10, D11): lo que hace cada tipo elegido. «Cálculo» abre la C con «=»; «Valor fijo» se queda con la cifra de ahora; «Lo
// escribe el asesor» e «Interruptor» cambian en el acto; los que piden algo (el campo, la clave, la tabla, las opciones) abren su panel. Un rechazo va a un aviso.
import { avisar } from '@/shared/ui/toasts'
import type { FilaDeLaHoja } from '../../../entities/formula/hoja-de-la-planilla'
import type { PedidoDeTipo, TipoDeCelda } from '../../../entities/formula/tipo-de-celda'
import type { CifraDeLaFila } from '../../../entities/formula/vista-previa'
import type { CeldaActiva } from './use-cuadricula'
import type { EdicionConReferencias } from './use-edicion-con-referencias'
import type { OperacionesDeFila } from './use-operaciones-de-fila'
import type { PanelesDeLaPlanilla } from './use-paneles-de-la-planilla'

type Contexto = {
  ops: OperacionesDeFila
  edicion: EdicionConReferencias
  paneles: PanelesDeLaPlanilla
  cifra: CifraDeLaFila | undefined
  elegir: (celda: CeldaActiva) => void
}

// El pedido de los tipos que cambian en el acto; nulo para los que abren algo.
function pedidoEnElActo(tipo: TipoDeCelda, cifra: CifraDeLaFila | undefined): PedidoDeTipo | null {
  switch (tipo) {
    case 'valor_fijo':
      return { tipo, valor: cifra?.tipo === 'valor' ? cifra.valor : 0 }
    case 'lo_escribe_el_asesor':
    case 'interruptor':
      return { tipo }
    case 'calculo':
    case 'dato_del_vehiculo':
    case 'tipo_de_cambio':
    case 'de_una_tabla':
    case 'variante':
      return null
  }
}

export function elegirTipo(fila: FilaDeLaHoja, tipo: TipoDeCelda, c: Contexto) {
  const celda: CeldaActiva = { id: fila.id, col: 'C' }
  if (tipo === 'calculo') {
    c.elegir(celda)
    c.edicion.abrir(
      celda,
      fila.tipo === 'calculo' ? { en: 'celda' } : { en: 'celda', tipeado: '=' },
    )
    return
  }
  const pedido = pedidoEnElActo(tipo, c.cifra)
  if (pedido === null) return void c.paneles.tipo.abrir({ fila: fila.id, tipo })
  if (tipo === fila.tipo) return
  const motivo = c.ops.cambiarTipo(fila.numero, pedido)
  if (motivo !== null) avisar(motivo)
}
