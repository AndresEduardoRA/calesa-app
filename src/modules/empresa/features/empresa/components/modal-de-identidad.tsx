'use client'

import { useState } from 'react'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { useGuardarTarjeta, type LogoElegido } from '../hooks/use-guardar-tarjeta'
import { CampoColor } from './campo-color'
import { CampoLogo } from './campo-logo'
import { CampoEscrito } from './campos-del-modal'

export type PropsDeModalDeAjustes = {
  abierto: boolean
  alCerrar: () => void
  // Lo guardado, con la versión de la fila: llega por props y nunca va en la `key`.
  ajustes: AjustesEmpresa
}

type Props = PropsDeModalDeAjustes & {
  // URL pública de los logos guardados, ya armadas en el servidor.
  logoUrl: string | null
  logoOscuroUrl: string | null
}

export const CONFLICTO_DE_AJUSTES =
  'Recargar trae la versión de ahora y conserva lo que escribiste.'

// «Identidad» (`?panel=identidad`): nombre, color y los dos logos. Cada apertura empieza de lo guardado.
export function ModalDeIdentidad(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeIdentidad key={apertura} {...props} />
}

function FormularioDeIdentidad({ logoUrl, logoOscuroUrl, ...props }: Props) {
  const [logo, setLogo] = useState<LogoElegido>({ tipo: 'igual' })
  const [logoOscuro, setLogoOscuro] = useState<LogoElegido>({ tipo: 'igual' })
  const formulario = useGuardarTarjeta({
    tarjeta: 'identidad',
    ...props,
    logos: { claro: logo, oscuro: logoOscuro },
  })
  return (
    <ModalDeFormulario
      id="ajustes-identidad"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Identidad"
      descripcion="Lo que identifica a la empresa en toda la app."
      ancho="amplio"
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES}
    >
      <CampoEscrito
        formulario={formulario}
        campo="nombre"
        etiqueta="Nombre de la empresa"
        autoComplete="organization"
        maxLength={80}
      />
      <CampoColor
        valor={String(formulario.escrito.colorAcento ?? '')}
        alCambiar={(valor) => {
          formulario.cambiar('colorAcento', valor)
        }}
        error={formulario.errores['colorAcento']}
      />
      <CampoLogo
        variante="claro"
        urlActual={logoUrl}
        cambio={logo}
        alCambiar={setLogo}
        deshabilitado={formulario.enCurso}
      />
      <CampoLogo
        variante="oscuro"
        urlActual={logoOscuroUrl}
        cambio={logoOscuro}
        alCambiar={setLogoOscuro}
        deshabilitado={formulario.enCurso}
      />
    </ModalDeFormulario>
  )
}
