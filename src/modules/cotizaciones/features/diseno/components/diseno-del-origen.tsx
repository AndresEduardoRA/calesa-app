'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { TonoDelCatalogo } from './aspecto'
import { EditorDelDiseno } from './editor-del-diseno'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  origen: Origen
  // La versión que se edita; con diseño nulo no hay nada que editar.
  leida: DisenoParaEditar | null
  niveles: readonly NivelDelDiseno[]
  // Los tonos del catálogo, en la forma de la celda; sin ellos la vista previa se dibuja sin colores.
  tonos: readonly Tono[]
  // Sus claves y nombres para elegir el color; nulo si no se pudo leer.
  catalogo: readonly TonoDelCatalogo[] | null
}

// La pestaña «Hoja» de un origen en Configuración › Cotización (el diseño de la hoja, 4.22-2). Sin versión o sin diseño, un
// vacío. El editor no se vuelve a montar al guardar (su `key` no lleva la versión); sólo «Recargar» tras un conflicto lo monta de nuevo, en la misma transición que
// trae la pestaña, sobre lo que haya entonces.
export function DisenoDelOrigen({ origen, leida, niveles, tonos, catalogo }: Props) {
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  const [recargando, recargarPagina] = useTransition()
  const recargar = () => {
    recargarPagina(() => {
      router.refresh()
      setVuelta((v) => v + 1)
    })
  }
  const diseno = leida?.diseno ?? null
  return (
    <div className="grid min-w-0 gap-4">
      {leida === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Este origen todavía no tiene una fórmula.
        </p>
      ) : diseno === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Esta versión no tiene diseño de la hoja.
        </p>
      ) : (
        <EditorDelDiseno
          key={`${origen.id}:${String(vuelta)}`}
          origen={origen}
          leida={leida}
          disenoLeido={diseno}
          niveles={niveles}
          tonos={tonos}
          catalogo={catalogo}
          recargando={recargando}
          alRecargar={recargar}
        />
      )}
    </div>
  )
}
