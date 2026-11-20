'use client'

import type { ComponentType } from 'react'
import { MARGEN_DEL_LIENZO } from '../../../../entities/plantilla/edicion/disposicion'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import type { EditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import type { LienzoDelEditor } from '../../hooks/use-lienzo-del-editor'
import { BarraDelLienzo } from './barra-del-lienzo'
import { CapaDeEdicion } from './capa-de-edicion'
import { OcultasConEstaReferencia } from './ocultas-con-esta-referencia'
import { SelectorDeReferencia } from './selector-de-referencia'

type Props = {
  editor: EditorDeLaCuadricula
  lienzo: LienzoDelEditor
  ocupado: boolean
  origen: string
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  alElegirReferencia: (ejemplo: boolean) => void
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  alFallarElLogo: () => void
}

// La barra y el lienzo: la tarjeta a escala que dibuja el área `tarjeta` (el hueco `Lienzo`), con la capa del editor encima y, debajo, las filas ocultas con esta
// referencia.
export function ZonaDelLienzo({
  editor,
  lienzo,
  ocupado,
  origen,
  referencia,
  ejemplo,
  alElegirReferencia,
  Lienzo,
  alFallarElLogo,
}: Props) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <BarraDelLienzo
        disponible={lienzo.disponible}
        historial={editor.estado.historial}
        hacer={editor.hacer}
        ocupado={ocupado}
        escala={lienzo.escala}
        alCambiarLaEscala={lienzo.setEscala}
        tamano={lienzo.tamano}
        rechazo={editor.estado.rechazo}
        referencia={
          <SelectorDeReferencia
            referencia={referencia}
            ejemplo={ejemplo}
            origen={origen}
            alElegir={alElegirReferencia}
          />
        }
      />
      <Lienzo
        lectura={lienzo.lectura}
        referencia={referenciaUsada(referencia, ejemplo)}
        escala={lienzo.escala}
        margen={MARGEN_DEL_LIENZO}
        alFallarElLogo={alFallarElLogo}
        capa={(g, factor) => (
          <CapaDeEdicion
            g={g}
            escala={factor}
            editor={editor}
            plantilla={lienzo.dibujada}
            ocupado={ocupado}
            disponible={lienzo.disponible}
            rejilla={lienzo.rejilla}
            nombreDe={lienzo.nombreDe}
            alEditarContenido={lienzo.alEditarContenido}
            alAnchoProvisional={lienzo.setProvisional}
            alTamano={lienzo.setTamano}
          />
        )}
        debajo={(g) => (
          <OcultasConEstaReferencia
            ocultas={g.ocultas}
            alElegir={(fila) => {
              const f = editor.mapa.indiceDeFila.get(fila)
              if (f !== undefined)
                editor.hacer({
                  tipo: 'seleccionar',
                  seleccion: { tipo: 'filas', desde: f, hasta: f },
                })
            }}
          />
        )}
      />
    </div>
  )
}
