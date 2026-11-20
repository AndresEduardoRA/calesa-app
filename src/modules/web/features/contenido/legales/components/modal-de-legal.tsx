'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { htmlDelDocumento } from '../../../../entities/contenido/doc'
import {
  MAXIMO_DEL_TITULO_LEGAL,
  TEXTOS_DE_LEGALES,
  type ClaveDeLegal,
  type LegalGuardado,
} from '../../../../entities/contenido/legales'
import { EditorDeDocumentoDiferido } from '../../editor/components/editor-diferido'
import { useModalDeLegal } from '../hooks/use-modal-de-legal'

export type PropsDeModalDeLegal = {
  clave: ClaveDeLegal
  abierto: boolean
  alCerrar: () => void
  guardado: LegalGuardado | null
  // La versión de la fila de ajustes (la misma de «Ajustes»).
  actualizadoEn: string
}

const CONFLICTO = 'Recargar trae la versión de ahora y conserva lo que escribiste.'

// El modal de un documento legal (`?panel=terminos|privacidad`). Cada apertura empieza de lo guardado, o de lo que quedó sin guardar.
export function ModalDeLegal(props: PropsDeModalDeLegal) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLegal key={apertura} {...props} />
}

function FormularioDeLegal({
  clave,
  abierto,
  alCerrar,
  guardado,
  actualizadoEn,
}: PropsDeModalDeLegal) {
  const id = useId()
  const textos = TEXTOS_DE_LEGALES[clave]
  const modal = useModalDeLegal({ clave, guardado, actualizadoEn, abierto, alCerrar })
  const { formulario, valores } = modal
  const html = htmlDelDocumento(valores.doc)
  const error =
    formulario.errores[clave] ??
    formulario.errores['legales'] ??
    (html.ok ? undefined : html.motivo)
  return (
    <ModalDeFormulario
      id={`legal-${clave}`}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={textos.titulo}
      ancho="grande"
      formulario={formulario}
      detalleDelConflicto={CONFLICTO}
    >
      <Campo
        nombre={`${clave}-titulo`}
        etiqueta="Título"
        maxLength={MAXIMO_DEL_TITULO_LEGAL}
        autoComplete="off"
        value={valores.titulo}
        disabled={formulario.enCurso}
        onChange={(evento) => {
          modal.cambiarTitulo(evento.target.value)
        }}
        error={formulario.errores[`${clave}Titulo`]}
      />
      <div className="grid gap-1.5">
        <p id={`${id}-etiqueta`} className="text-sm leading-none font-medium text-(--color-ink)">
          {textos.editor}
        </p>
        <EditorDeDocumentoDiferido
          valor={valores.doc}
          alCambiar={modal.cambiarDocumento}
          etiquetaId={`${id}-etiqueta`}
          errorId={error ? `${id}-error` : undefined}
          invalido={error !== undefined}
          deshabilitado={formulario.enCurso}
          imagenes={false}
        />
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {error}
          </p>
        ) : null}
      </div>
    </ModalDeFormulario>
  )
}
