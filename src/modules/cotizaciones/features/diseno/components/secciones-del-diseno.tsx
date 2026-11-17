'use client'

import type { Tono } from '@/shared/ui/xcell'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import type { useEditorDelDiseno } from '../hooks/use-editor-del-diseno'
import type { TonoDelCatalogo } from './aspecto'
import { ListaOrdenable } from './orden'
import { SeccionEditable } from './seccion-editable'

type Props = {
  editor: ReturnType<typeof useEditorDelDiseno>
  ediciones: EdicionesDelDiseno
  niveles: readonly NivelDelDiseno[]
  tablas: readonly string[]
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
}

// Las secciones del diseño en su orden, que se cambia arrastrando el asa de cada una o con el teclado sobre ella.
export function SeccionesDelDiseno({
  editor,
  ediciones,
  niveles,
  tablas,
  catalogo,
  colores,
}: Props) {
  const { secciones } = editor.trabajo
  return (
    <ListaOrdenable
      ids={secciones.map((s) => s.id)}
      nombreDe={(id) => `la sección ${secciones.find((s) => s.id === id)?.titulo ?? id}`}
      ocupado={editor.ocupado}
      alMover={ediciones.moverSeccion}
    >
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {secciones.map((seccion) => (
          <SeccionEditable
            key={seccion.id}
            seccion={seccion}
            nodos={editor.nodos}
            etiquetas={editor.nombresDeNodos}
            niveles={niveles}
            tablas={tablas}
            catalogo={catalogo}
            colores={colores}
            ediciones={ediciones}
            ocupado={editor.ocupado}
            rechazo={editor.rechazo}
            alPonerSeccion={(cambios) => {
              editor.ponerSeccion(seccion.id, cambios)
            }}
            alPonerAncho={(nodo, ancho) => {
              editor.ponerAncho(seccion.id, nodo, ancho)
            }}
            alPonerNiveles={(nodo, cambios) => {
              editor.ponerNiveles(seccion.id, nodo, cambios)
            }}
          />
        ))}
      </ul>
    </ListaOrdenable>
  )
}
