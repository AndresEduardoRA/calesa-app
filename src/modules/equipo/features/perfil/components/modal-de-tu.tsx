'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useEnvioDelPerfil } from '../hooks/use-envio-del-perfil'
import { FotoPerfil } from './foto-perfil'

export type PropsDeModalDeTu = {
  abierto: boolean
  alCerrar: () => void
  usuarioId: string
  nombre: string
  email: string
  avatarRuta: string | null
  // URL pública de `avatarRuta`, ya armada en el servidor.
  avatarUrl: string | null
  // ISO: el `actualizado_en` del perfil al abrir el modal.
  actualizadoEn: string
}

// «Tú» (`?panel=tu`): nombre y foto. Cada apertura empieza de lo guardado.
export function ModalDeTu(props: PropsDeModalDeTu) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeTu key={apertura} {...props} />
}

function FormularioDeTu({
  abierto,
  alCerrar,
  usuarioId,
  nombre: nombreGuardado,
  email,
  avatarRuta,
  avatarUrl,
  actualizadoEn,
}: PropsDeModalDeTu) {
  const modal = useEnvioDelPerfil({
    usuarioId,
    avatarRuta,
    nombreGuardado,
    actualizadoEn,
    abierto,
    alCerrar,
  })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="perfil-tu"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Tú"
      formulario={formulario}
      focoInicial={() => document.getElementById('nombre')}
      detalleDelConflicto="No se guardó nada. Recargar trae tu perfil de ahora y conserva lo que escribiste."
    >
      <FotoPerfil
        nombre={modal.nombre}
        urlActual={avatarUrl}
        cambio={modal.foto}
        alCambiar={modal.setFoto}
        deshabilitado={formulario.enCurso}
      />
      <Campo
        nombre="nombre"
        etiqueta="Nombre y apellido"
        autoComplete="name"
        value={modal.nombre}
        onChange={(evento) => {
          modal.cambiarNombre(evento.target.value)
        }}
        error={formulario.errores['nombre']}
      />
      <Campo
        nombre="email"
        etiqueta="Correo"
        type="email"
        defaultValue={email}
        readOnly
        ayuda="Es el correo con el que ingresas. No se cambia desde acá."
      />
    </ModalDeFormulario>
  )
}
