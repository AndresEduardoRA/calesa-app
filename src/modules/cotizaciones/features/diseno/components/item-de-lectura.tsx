import type { ItemDeDiseno } from '../../../entities/diseno'
import type { CambioDeAspectoDeItem } from '../../../entities/diseno/edicion-del-aspecto'
import type { Nodo } from '../../../entities/nodos'
import type { FilaOrdenable } from '../hooks/use-fila-ordenable'
import { CamposDelAspectoDelItem, type ErrorDelAspecto } from './aspecto'
import { TituloConAsa } from './orden'

const MAXIMO_DE_OPCIONES_A_LA_VISTA = 4

type Props = {
  seccionId: string
  item: Extract<ItemDeDiseno, { tipo: 'variante' | 'subtotal' }>
  etiqueta: string
  // El nodo de la fórmula: la variante lista sus opciones.
  definicion: Nodo | undefined
  ocupado: boolean
  fila: FilaOrdenable
  error: ErrorDelAspecto
  alPonerAspecto: (cambios: CambioDeAspectoDeItem) => void
}

function textoDeLaVariante(definicion: Nodo | undefined) {
  const opciones = definicion?.tipo === 'opcion' ? definicion.opciones.map((o) => o.etiqueta) : []
  const vistas = opciones.slice(0, MAXIMO_DE_OPCIONES_A_LA_VISTA).join(', ')
  const resto = opciones.length - MAXIMO_DE_OPCIONES_A_LA_VISTA
  const lista = resto > 0 ? `${vistas} y ${String(resto)} más` : vistas
  return `Se elige con chips: ${lista}. La hoja siempre la pide.`
}

// Variante y subtotal no tienen más campo que su nodo: se ven, se ordenan y llevan su aspecto (cambiarles el nodo es mover estructura).
export function ItemDeLectura({
  seccionId,
  item,
  etiqueta,
  definicion,
  ocupado,
  fila: { alMontar, estilo, asa },
  error,
  alPonerAspecto,
}: Props) {
  const { tipo, nodo } = item
  return (
    <li
      ref={alMontar}
      style={estilo}
      className="@container min-w-0 rounded-(--radius-md) border border-dashed border-(--color-line) bg-(--color-surface) p-3"
      data-item={`${tipo}:${nodo}`}
    >
      <TituloConAsa etiquetaDelAsa={`Mover «${etiqueta}»`} asa={asa}>
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {tipo === 'variante' ? `Variante ${etiqueta}.` : `Subtotal ${etiqueta}.`}
        </p>
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {tipo === 'variante'
            ? textoDeLaVariante(definicion)
            : 'Se dibuja como una franja con el total de lo que suma.'}
        </p>
      </TituloConAsa>
      <CamposDelAspectoDelItem
        base={`${seccionId}__${nodo}`}
        item={item}
        ocupado={ocupado}
        error={error}
        alPoner={alPonerAspecto}
      />
    </li>
  )
}
