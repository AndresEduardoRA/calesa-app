'use client'

import { useId, type ReactNode } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'

type Props = {
  hayCambios: boolean
  // El rechazo de `cambiarTipo()`, o nulo: va arriba del pie y lo elegido queda.
  motivo: string | null
  // Falta algo por elegir: «Aplicar» no envía.
  listo: boolean
  alEnviar: () => void
  alCancelar: () => void
  children: ReactNode
}

// El formulario de cada tipo de celda que pide algo (D11): sus campos, el rechazo y el pie «Aplicar». Cerrar con algo elegido pregunta.
export function MarcoDelTipo({ hayCambios, motivo, listo, alEnviar, alCancelar, children }: Props) {
  const id = `${useId()}-tipo`
  useCambiosSinGuardar(hayCambios, undefined, { preguntaAlCerrar: true })
  return (
    <form
      id={id}
      aria-label="Tipo de celda"
      className="grid min-w-0 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        alEnviar()
      }}
    >
      {children}
      {motivo === null ? null : (
        <p
          role="alert"
          className="rounded-(--radius-md) bg-(--color-aviso-soft) px-3 py-2 text-(--color-aviso-ink)"
        >
          {motivo}
        </p>
      )}
      <PieDelPanel
        idFormulario={id}
        enCurso={false}
        alCancelar={alCancelar}
        etiquetaDeGuardar="Aplicar"
        sinPuedeEnviar={!listo}
      />
    </form>
  )
}
