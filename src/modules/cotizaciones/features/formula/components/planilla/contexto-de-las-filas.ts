// Lo que cada fila de la planilla sabe de la sesión, armado una vez por render de la planilla: de ahí `propsDeLaFila()` saca lo de cada una (su cifra, su B, si su C
// se edita, el rechazo que la nombra, el formulario de «Sumar fila debajo»). Una función aparte para que la tabla no cargue con tantas condiciones.
import type { UnidadDeEjemplo } from '../../../../entities/formula/unidad-de-ejemplo'
import { celdaB } from '../../../../entities/formula/planilla'
import type { CifraDeLaFila, VistaPrevia } from '../../../../entities/formula/vista-previa'
import type { Nodo } from '../../../../entities/nodos'
import type { EditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import type { AccionesDeLaUnidad, ValorDeLaUnidad } from './celda-de-la-unidad'
import type { CeldaB, FilaDeLaPlanillaProps } from './fila-de-la-planilla'

export type ContextoDeLasFilas = {
  editor: EditorDeLaFormula
  nodos: ReadonlyMap<string, Nodo>
  elegida: string | null
  cifras: ReadonlyMap<string, CifraDeLaFila>
  // «De dónde sale» de cada fila, una vez por fórmula de trabajo.
  dichas: ReadonlyMap<string, string>
  vista: VistaPrevia | null
  unidad: UnidadDeEjemplo
  // El motivo de por qué esperan las celdas de la fórmula (nulo: no esperan).
  motivo: string | null
  idDelMotivo: string
  alElegir: (id: string) => void
  acciones: AccionesDeLaUnidad
}

const SIN_CIFRA: CifraDeLaFila = { tipo: 'nada' }
// Las filas sin el formulario de «Sumar fila debajo» reciben estas, estables: `crear` y `cancelarSumar` cambian en cada render y redibujarían las 500 filas `memo`.
const SIN_CREAR = () => undefined
const SIN_CANCELAR = () => undefined

const numeroDe = (vista: VistaPrevia | null, id: string): number | null => {
  const v = vista?.tipo === 'calculada' ? vista.valores.get(id) : undefined
  return typeof v === 'number' ? v : null
}

function bDe(ctx: ContextoDeLasFilas, fila: FilaParaDibujar): CeldaB | null {
  const b = celdaB(fila, ctx.nodos)
  if (b === null) return null
  return {
    ...b,
    valor: b.editable
      ? (ctx.editor.trabajo.params.constantes[b.pct] ?? null)
      : numeroDe(ctx.vista, b.pct),
    formato: ctx.nodos.get(b.pct)?.formato,
  }
}

// Lo que la unidad de ejemplo tiene para esa fila: lo tipeado (0 sin tipear), la bandera, el dato del vehículo (nulo sin dato) o la variante elegida.
function unidadDe(unidad: UnidadDeEjemplo, nodo: Nodo): ValorDeLaUnidad | undefined {
  if (nodo.tipo === 'input') return unidad.inputs[nodo.id] ?? 0
  if (nodo.tipo === 'bandera') return unidad.banderas[nodo.id] ?? false
  if (nodo.tipo === 'opcion') {
    // Una clave que ya no es opción (se quitó en el Modo avanzado) no se marca: el cálculo usa la por defecto (`entradaDeLaUnidad()`).
    const { variante } = unidad
    return variante !== undefined && nodo.opciones.some((o) => o.clave === variante)
      ? variante
      : (nodo.por_defecto ?? null)
  }
  if (nodo.tipo !== 'campo_vehiculo') return undefined
  return Object.hasOwn(unidad.vehiculo, nodo.campo) ? (unidad.vehiculo[nodo.campo] ?? null) : null
}

export function propsDeLaFila(
  ctx: ContextoDeLasFilas,
  numero: number,
  fila: FilaParaDibujar,
): FilaDeLaPlanillaProps {
  const { editor } = ctx
  const { nueva } = editor
  const sumando = nueva.sumando?.tras === fila.id ? { error: nueva.sumando.error } : null
  return {
    numero,
    fila,
    elegida: ctx.elegida === fila.id,
    deDondeSale: ctx.dichas.get(fila.id) ?? '',
    cifra: ctx.cifras.get(fila.id) ?? SIN_CIFRA,
    leyendo: ctx.vista === null,
    b: bDe(ctx, fila),
    constante:
      fila.nodo.tipo === 'constante'
        ? (editor.trabajo.params.constantes[fila.id] ?? null)
        : undefined,
    unidad: unidadDe(ctx.unidad, fila.nodo),
    bloqueada: ctx.motivo !== null,
    idDelMotivo: ctx.idDelMotivo,
    rechazo: editor.rechazo?.filaId === fila.id ? editor.rechazo.mensaje : null,
    sumando,
    ocupados: nueva.ocupados,
    alCrear: sumando === null ? SIN_CREAR : nueva.crear,
    alCancelarSumar: sumando === null ? SIN_CANCELAR : nueva.cancelarSumar,
    alElegir: ctx.alElegir,
    alCambiarValor: editor.cambiarValor,
    acciones: ctx.acciones,
  }
}

// Por qué esperan las celdas de la fórmula; nulo si se pueden editar.
export function motivoDeEspera(editor: EditorDeLaFormula): string | null {
  if (editor.guardado.enCurso) return 'Espera a que se guarde el borrador.'
  if (editor.abierta !== null) return 'Aplica o descarta el texto de la barra de fórmula.'
  if (editor.grupos.abierto !== null) return 'Aplica o cancela el grupo abierto.'
  if (editor.nueva.sumando !== null) return 'Crea o cancela la fila nueva.'
  return null
}
