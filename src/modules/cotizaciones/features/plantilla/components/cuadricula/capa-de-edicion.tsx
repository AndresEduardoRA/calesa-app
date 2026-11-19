'use client'

import { useEffect, type RefObject } from 'react'
import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import type { Caja, PiezaDeLaCapa } from '../../../../entities/plantilla/edicion/disposicion'
import type { Disponibilidad } from '../../../../entities/plantilla/edicion/disponibilidad'
import { copiar, textoDelBloque } from '../../../../entities/plantilla/edicion/portapapeles'
import type { GeometriaParaEditar } from '../../../../entities/vista-previa-de-la-plantilla'
import { useCapaDeEdicion } from '../../hooks/use-capa-de-edicion'
import type { EditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import { useOyentesDeLaCapa } from '../../hooks/use-oyentes-de-la-capa'
import { OrdenDeLasFilas } from './asas-de-fila'
import { CeldaEnEdicion } from './celda-en-edicion'
import { MarcasDeLaCapa } from './marcas-de-la-capa'
import { MenuContextual } from './menu-contextual'
import { RejillaDelLienzo } from './rejilla-del-lienzo'

type Props = {
  g: GeometriaParaEditar
  escala: number
  editor: EditorDeLaCuadricula
  // La cuadrícula que se dibuja (con el ancho de una columna mientras se arrastra su borde).
  plantilla: PlantillaEnCuadricula
  ocupado: boolean
  disponible: Disponibilidad
  rejilla: RefObject<HTMLDivElement | null>
  nombreDe: (pieza: PiezaDeLaCapa) => string | undefined
  alEditarContenido: () => void
  alAnchoProvisional: (provisional: { columna: number; ancho: number } | null) => void
  // El tamaño de la tarjeta dibujada (para «960 × 512 px» de la barra).
  alTamano: (tamano: { ancho: number; alto: number }) => void
}

const SIN_CAJA: Caja = { x: 0, y: 0, ancho: 0, alto: 0 }

// La capa del editor sobre la tarjeta dibujada, como Excel: la grilla accesible con sus cabeceras y asas (`RejillaDelLienzo`, dentro del orden de filas de dnd-kit), el
// rango elegido, el cursor, la celda en la que se escribe y el menú contextual. No dibuja la tarjeta: va encima, sin escalar, y multiplica por la escala.
export function CapaDeEdicion(props: Props) {
  const { g, escala, editor, plantilla, rejilla, ocupado } = props
  const { estado, hacer, mapa } = editor
  const capa = useCapaDeEdicion(editor, plantilla, g, escala)
  const o = useOyentesDeLaCapa({
    editor,
    plantilla,
    capa,
    rejilla,
    alEditarContenido: props.alEditarContenido,
  })
  const escritura = estado.escribiendo
  const { alTamano } = props
  useEffect(() => {
    alTamano({ ancho: g.ancho, alto: g.alto })
  }, [alTamano, g.ancho, g.alto])
  return (
    <OrdenDeLasFilas
      ids={capa.d.filas.map((f) => f.id)}
      numeroDe={(id) => (mapa.indiceDeFila.get(id) ?? 0) + 1}
      ocupado={ocupado}
      alMover={(desde, hasta) => {
        const a = mapa.indiceDeFila.get(desde)
        const b = mapa.indiceDeFila.get(hasta)
        if (a !== undefined && b !== undefined) hacer({ tipo: 'moverFila', desde: a, hasta: b })
      }}
    >
      <div className="relative size-full" data-capa-de-edicion="">
        <RejillaDelLienzo
          rejilla={rejilla}
          capa={capa}
          plantilla={plantilla}
          escala={escala}
          seleccion={estado.seleccion}
          hacer={hacer}
          ocupado={ocupado}
          nombreDe={props.nombreDe}
          enfocar={o.enfocar}
          alAnchoProvisional={props.alAnchoProvisional}
          oyentes={o.oyentes}
        />
        <MarcasDeLaCapa rango={capa.cajaDelRango} cursor={o.conFoco ? capa.cajaActiva : null} />
        {escritura === null || capa.cajaDeLaEscritura === null ? null : (
          <CeldaEnEdicion
            texto={escritura.texto}
            caja={capa.cajaDeLaEscritura}
            alEscribir={(texto) => {
              hacer({ tipo: 'escribir', texto })
            }}
            alConfirmar={() => {
              hacer({ tipo: 'confirmarEscritura' })
            }}
            alVolver={o.enfocar}
            alDescartar={() => {
              hacer({ tipo: 'descartarEscritura' })
              o.enfocar()
            }}
          />
        )}
        <MenuContextual
          abierto={o.menu}
          caja={capa.cajaActiva ?? SIN_CAJA}
          disponible={props.disponible}
          hacer={hacer}
          alCopiar={() => {
            hacer({ tipo: 'copiar' })
            const { rango } = capa
            if (rango !== null)
              void navigator.clipboard
                .writeText(textoDelBloque(copiar(plantilla, rango)))
                .catch(() => undefined)
          }}
          alCerrar={o.cerrarMenu}
        />
      </div>
    </OrdenDeLasFilas>
  )
}
