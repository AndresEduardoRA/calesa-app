'use client'

import {
  useEdicionAPantallaCompleta,
  useEnLaEdicion,
} from '@/shared/ui/edicion-a-pantalla-completa'
import { estadoDeLaTarjeta } from '../../../../entities/plantilla/estado-de-la-edicion'
import type { useEditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import type { useGuardarLaPlantilla } from '../../hooks/use-guardar-la-plantilla'
import { BotonesDeLaPlantilla } from '../botones-de-la-plantilla'
import { EncabezadoDelEditor } from '../encabezado-del-editor'
import type { PropsDelEditorDeLaCuadricula } from './editor-de-la-cuadricula'

type Props = {
  props: PropsDelEditorDeLaCuadricula
  editor: ReturnType<typeof useEditorDeLaCuadricula>
  guardar: ReturnType<typeof useGuardarLaPlantilla>
}

// Lo de arriba del editor de la tarjeta: sus botones de versiones. Fuera de la edición a pantalla completa, bajo el encabezado propio («Tarjeta de <Origen>», de dónde
// nace); dentro, los botones suben a la barra de la edición junto al estado (`useEdicionAPantallaCompleta`) y «Salir» pregunta si hay cambios sin guardar.
export function CabezaDelEditor({ props, editor, guardar }: Props) {
  const enLaEdicion = useEnLaEdicion()
  const { origen, esperada, publicada } = props
  useEdicionAPantallaCompleta({
    estado: estadoDeLaTarjeta({ hayCambios: editor.hayCambios, esperada, publicada }),
    hayCambios: editor.hayCambios,
    alDescartar: editor.limpiar,
  })
  const botones = (
    <BotonesDeLaPlantilla
      esperada={esperada}
      hayCambios={editor.hayCambios}
      ocupado={guardar.ocupado || guardar.conflicto !== null}
      guardar={{
        puede: editor.puedeGuardar,
        motivo: editor.motivoParaNoGuardar,
        enCurso: guardar.enCurso,
        alGuardar: () => void guardar.enviar(),
      }}
      alPublicar={props.alPublicar}
      alDescartar={props.alDescartar}
    />
  )
  return enLaEdicion ? (
    botones
  ) : (
    <EncabezadoDelEditor
      origen={origen}
      de={props.de}
      esperada={esperada}
      publicada={publicada}
      acciones={botones}
    />
  )
}
