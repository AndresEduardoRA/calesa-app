import { ACCIONES, BOTON_DE_ACCION, ETIQUETA, PUNTO } from './clases'
import {
  IconoDeXCell,
  ID_DE_AJUSTES,
  ID_DE_AYUDA,
  ID_DE_RESTABLECER,
  type IdDeIcono,
} from './simbolos-de-xcell'

// Las acciones se recorren con las flechas desde el valor (no son paradas de Tab), en este orden: ayuda → ⚙ → ↺.
export const PARADA_DE_ACCIONES_DESDE = 10
export const PARADA_DE_AYUDA = 10
export const PARADA_DE_AJUSTES = 11
export const PARADA_DE_RESTABLECER = 12

type PropsDelRotulo = {
  idDeLaEtiqueta: string
  label: string
  sugerido: boolean
}

type PropsDeLasAcciones = {
  label: string
  // Se dibujan si la hoja las pide (`hasHelp`, `hasSettings`) y ofrece con qué responder; la celda no decide permisos ni abre nada.
  alAyudar: (() => void) | null
  alAjustar: (() => void) | null
  // `null` = sin ↺; si no, lo que dice («Volver al valor por defecto» o «Volver al sugerido»).
  restablecer: string | null
  alRestablecer: () => void
}

type PropsDeAccion = {
  parada: number
  nombre: string
  titulo: string
  icono: IdDeIcono
  alAccionar: () => void
}

function BotonDeAccion({ parada, nombre, titulo, icono, alAccionar }: PropsDeAccion) {
  return (
    <button
      type="button"
      tabIndex={-1}
      data-parada={parada}
      className={BOTON_DE_ACCION}
      aria-label={nombre}
      title={titulo}
      onClick={alAccionar}
    >
      <IconoDeXCell id={icono} />
    </button>
  )
}

// Al principio de la fila: el punto de lo sugerido y el rótulo, que se corta con «…» y lleva el texto completo en `title`. Sin envoltorio: son hijos de la celda (un nodo
// menos por celda; la hoja tiene cientos).
export function RotuloDeXCell({ idDeLaEtiqueta, label, sugerido }: PropsDelRotulo) {
  return (
    <>
      {sugerido ? (
        <>
          <span aria-hidden title="Sugerido" className={PUNTO} />
          <span className="sr-only">Sugerido</span>
        </>
      ) : null}
      <span id={idDeLaEtiqueta} title={label} className={ETIQUETA}>
        {label}
      </span>
    </>
  )
}

// Al final de la fila, detrás del valor: la ranura de las acciones, que siempre existe para que aparecer o irse una acción no mueva el resto.
export function AccionesDeXCell(props: PropsDeLasAcciones) {
  const { label, alAyudar, alAjustar, restablecer, alRestablecer } = props
  return (
    <span className={ACCIONES}>
      {alAyudar === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_AYUDA}
          nombre={`Ayuda de ${label}`}
          titulo="Ayuda"
          icono={ID_DE_AYUDA}
          alAccionar={alAyudar}
        />
      )}
      {alAjustar === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_AJUSTES}
          nombre={`Cambiar el valor por defecto de ${label}`}
          titulo="Cambiar el valor por defecto"
          icono={ID_DE_AJUSTES}
          alAccionar={alAjustar}
        />
      )}
      {restablecer === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_RESTABLECER}
          nombre={`${restablecer} de ${label}`}
          titulo={restablecer}
          icono={ID_DE_RESTABLECER}
          alAccionar={alRestablecer}
        />
      )}
    </span>
  )
}
