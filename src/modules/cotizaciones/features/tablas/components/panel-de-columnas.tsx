'use client'

import { useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import {
  AVISO_DE_COMPARTIDA,
  AVISO_DE_QUITAR,
  SIN_CAMBIOS_EN_LAS_COLUMNAS,
} from '../../../entities/tablas/estructura'
import { useColumnasDeTabla } from '../hooks/use-columnas-de-tabla'
import { EditorDeColumnas } from './editor-de-columnas'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tabla: TablaDeReferencia
  origenId: string | null
}

// «Columnas de <nombre>» (`?tabla=<id>&panel=columnas-de-tabla`): renombrar, sumar, ordenar y quitar columnas, y guardar todo junto con la versión abierta. Al
// pie, lo que va a pasar («Se suma 1 · se quita 1») o «Sin cambios en las columnas.». Quien lo monta le da `key` por apertura: cada vez parte de la tabla.
export function PanelDeColumnas({ abierto, alCerrar, tabla, origenId }: Props) {
  const panel = useColumnasDeTabla({ tabla, origenId, alCerrar })
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Columnas de ${tabla.nombre}`}
      descripcion="El nombre se cambia cuando quieras; la clave y el tipo de una columna, no."
      ancho="amplio"
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={panel.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar="Guardar columnas"
          etiquetaEnCurso="Guardando…"
          sinPuedeEnviar={!panel.hayCambios || panel.conflicto !== null}
        />
      }
    >
      <CambiosSinGuardar hayCambios={panel.hayCambios} />
      <form
        ref={formulario}
        id={idFormulario}
        className="grid min-w-0 gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void panel.enviar().then((entro) => {
            if (!entro) enfocarPrimerError(formulario.current)
          })
        }}
      >
        {panel.conflicto ? (
          <AvisoDeConflicto
            mensaje={panel.conflicto}
            alRecargar={panel.recargar}
            enCurso={panel.recargando}
            detalle="Al recargar se abre la versión nueva; lo que cambiaste aquí no vuelve."
          />
        ) : null}
        {panel.error ? (
          <Aviso tono="peligro">
            <p className="break-words">{panel.error}</p>
          </Aviso>
        ) : null}
        {tabla.compartida ? (
          <p className="text-(length:--text-sm) text-(--color-ink)">{AVISO_DE_COMPARTIDA}</p>
        ) : null}
        <EditorDeColumnas
          edicion={panel.edicion}
          editar={panel.editar}
          porCampo={panel.porCampo}
          enCurso={panel.enCurso}
        />
        {panel.seQuitaAlguna ? (
          <Aviso tono="aviso">
            <p>{AVISO_DE_QUITAR}</p>
          </Aviso>
        ) : null}
        <p aria-live="polite" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {panel.hayCambios ? panel.resumen : SIN_CAMBIOS_EN_LAS_COLUMNAS}
        </p>
      </form>
    </Drawer>
  )
}
