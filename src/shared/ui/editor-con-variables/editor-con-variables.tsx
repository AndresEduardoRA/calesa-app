'use client'

import { cn } from 'cn'
import { useId } from 'react'
import { avisoDeVariablesDesconocidas, revisarVariables } from '@/shared/lib/texto-con-variables'
import { Label } from '../label'
import { BotonesDeVariable } from './botones-de-variable'
import { CajaConEspejo } from './caja-con-espejo'
import type { VariableDelEditor } from './tipos'
import { useInsercionEnElCursor } from './use-insercion-en-el-cursor'
import { VistaPreviaDelTexto } from './vista-previa-del-texto'

type Props = {
  id: string
  etiqueta: string
  valor: string
  alCambiar: (texto: string) => void
  variables: readonly VariableDelEditor[]
  // Un valor de ejemplo por clave: con él, la vista previa muestra el texto como se verá. Sin él, no hay vista previa.
  valores?: Readonly<Record<string, string>>
  // Por qué no se puede guardar (lo dice el modal al enviar): va junto al campo, en lugar del aviso en vivo.
  motivo?: string | null
  largoMaximo: number
  deshabilitado?: boolean
  etiquetaDeLaVistaPrevia?: string
}

// Un texto largo con variables entre llaves: una `<textarea>` nativa (teclado, deshacer, lector de pantalla, IME y celular intactos) con el
// texto transparente sobre un espejo que dibuja lo mismo con las variables como pastillas. Los botones de variable insertan `{clave}` donde
// está el cursor, o sobre lo seleccionado, y devuelven el foco con el cursor detrás. Avisa en vivo cada `{…}` que el texto no acepta,
// cuenta los caracteres y, con `valores`, muestra la vista previa. No guarda nada: lo controla quien lo usa.
export function EditorConVariables({
  id,
  etiqueta,
  valor,
  alCambiar,
  variables,
  valores,
  motivo = null,
  largoMaximo,
  deshabilitado = false,
  etiquetaDeLaVistaPrevia = 'Vista previa',
}: Props) {
  const { areaRef, guardarSeleccion, insertar } = useInsercionEnElCursor(valor, alCambiar)
  const idAviso = useId()
  const idContador = useId()
  const claves = variables.map((variable) => variable.clave)
  const obligatorias = variables.filter((v) => v.obligatoria === true).map((v) => v.clave)
  const { desconocidas, faltan } = revisarVariables(valor, claves, obligatorias)
  const presentes = new Set(claves.filter((clave) => !faltan.includes(clave)))
  const aviso = motivo ?? avisoDeVariablesDesconocidas(desconocidas, claves)
  const largo = [...valor].length

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{etiqueta}</Label>
        <BotonesDeVariable
          variables={variables}
          presentes={presentes}
          deshabilitado={deshabilitado}
          alInsertar={insertar}
        />
      </div>
      <div className="grid gap-1.5">
        <CajaConEspejo
          id={id}
          valor={valor}
          claves={claves}
          deshabilitado={deshabilitado}
          largoMaximo={largoMaximo}
          conAviso={aviso !== null}
          describedBy={`${idContador}${aviso ? ` ${idAviso}` : ''}`}
          areaRef={areaRef}
          alEscribir={alCambiar}
          alMoverLaSeleccion={guardarSeleccion}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p
            id={idAviso}
            role="status"
            aria-live="polite"
            className="min-w-0 flex-1 basis-40 text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {aviso}
          </p>
          <p
            id={idContador}
            className={cn(
              'text-(length:--text-xs) tabular-nums',
              largo > largoMaximo ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-faint)',
            )}
          >
            {largo} de {largoMaximo}
          </p>
        </div>
      </div>
      {valores ? (
        <VistaPreviaDelTexto
          etiqueta={etiquetaDeLaVistaPrevia}
          texto={valor}
          claves={claves}
          valores={valores}
        />
      ) : null}
    </div>
  )
}
