'use client'

import type { RefObject } from 'react'
import type { TonoDelCatalogo } from '../../../../../entities/plantilla/lectura-de-la-plantilla'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import type { EditorDeLaCuadricula } from '../../../hooks/use-editor-de-la-cuadricula'
import { PanelDeLaCelda } from './panel-de-la-celda'
import { PanelDeLaFila } from './panel-de-la-fila'
import { PanelResumen } from './panel-resumen'

type Props = {
  editor: EditorDeLaCuadricula
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
  nombrados: ReadonlySet<string>
  ocupado: boolean
  enfoque: RefObject<HTMLDivElement | null>
}

// El panel a la derecha del lienzo, según lo elegido: nada, «Resumen»; filas, la fila; celdas o columnas, la celda (aplicado a todas). Mientras se guarda, apagado.
export function PanelDelEditor({ editor, contexto, tonos, nombrados, ocupado, enfoque }: Props) {
  const { estado, plantilla, mapa, hacer } = editor
  const sel = estado.seleccion
  return (
    <aside aria-label="Panel de la tarjeta" className="min-w-0" data-panel-del-editor="">
      <fieldset
        disabled={ocupado}
        className="grid min-w-0 gap-4 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      >
        {sel === null ? (
          <PanelResumen
            plantilla={plantilla}
            tonos={tonos}
            bytes={editor.bytes}
            hacer={hacer}
            ocupado={ocupado}
          />
        ) : sel.tipo === 'filas' ? (
          <PanelDeLaFila
            plantilla={plantilla}
            fila={Math.min(sel.desde, sel.hasta)}
            contexto={contexto}
            nombrados={nombrados}
            hacer={hacer}
          />
        ) : (
          <PanelDeLaCelda
            plantilla={plantilla}
            mapa={mapa}
            seleccion={sel}
            contexto={contexto}
            tonos={tonos}
            nombrados={nombrados}
            enfoque={enfoque}
            hacer={hacer}
          />
        )}
      </fieldset>
    </aside>
  )
}
