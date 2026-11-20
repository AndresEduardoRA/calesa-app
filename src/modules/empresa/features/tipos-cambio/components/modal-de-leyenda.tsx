'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { useApertura } from '@/shared/ui/use-apertura'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { useState } from 'react'
import {
  caracteresDeLaLeyenda,
  LEYENDA_MAXIMA,
  type LeyendaDeTiposCambio,
} from '../../../entities/compartir-tipos-cambio'
import { guardarLeyendaDeTiposCambio } from '../actions/guardar-leyenda'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Lo guardado, con la versión de la fila: llega por props y nunca va en la `key`.
  leyenda: LeyendaDeTiposCambio
}

const NO_SE_GUARDO = 'No se pudo guardar la leyenda.'

// «Al compartir» (`?panel=leyenda`): el texto al pie de la imagen y del texto que se comparten con un cliente. Cada apertura empieza de lo guardado.
export function ModalDeLeyenda(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLeyenda key={apertura} {...props} />
}

// Sin `maxLength`, que cuenta unidades UTF-16: el tope lo dice «n de 120» y el motivo sale junto al campo.
function FormularioDeLeyenda({ abierto, alCerrar, leyenda }: Props) {
  const [texto, setTexto] = useState(leyenda.leyenda ?? '')
  const caracteres = caracteresDeLaLeyenda(texto.trim())
  const cambio = texto.trim() !== (leyenda.leyenda ?? '')
  const formulario = useEnvioConVersion({
    abierto,
    hayCambios: cambio,
    version: leyenda.actualizadoEn,
    validar: () =>
      caracteres > LEYENDA_MAXIMA
        ? { leyenda: `La leyenda admite hasta ${String(LEYENDA_MAXIMA)} caracteres.` }
        : null,
    // Sin cambios, guardar sólo cierra: no mueve la versión de la fila.
    pedir: () =>
      cambio
        ? enviarAccion(
            guardarLeyendaDeTiposCambio({
              leyenda: texto,
              actualizadoEnEsperado: leyenda.actualizadoEn,
            }),
            NO_SE_GUARDO,
          )
        : Promise.resolve({ ok: true as const, data: { actualizadoEn: leyenda.actualizadoEn } }),
    alGuardar: () => {
      avisarExito(texto.trim() === '' ? 'Leyenda quitada' : 'Leyenda guardada')
      alCerrar()
    },
  })
  return (
    <ModalDeFormulario
      id="leyenda-tipos-cambio-formulario"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Al compartir"
      descripcion="La leyenda va al pie de la imagen y del texto que se comparten con un cliente."
      formulario={formulario}
      detalleDelConflicto="Recargar trae la versión de ahora y conserva lo que escribiste."
    >
      <Campo
        nombre="leyenda"
        etiqueta="Leyenda"
        value={texto}
        placeholder="Valores referenciales"
        autoComplete="off"
        error={formulario.errores['leyenda']}
        ayuda={`${String(caracteres)} de ${String(LEYENDA_MAXIMA)}. Vacía, no se muestra.`}
        onChange={(evento) => {
          setTexto(evento.target.value)
          formulario.quitarMotivo('leyenda')
        }}
      />
    </ModalDeFormulario>
  )
}
