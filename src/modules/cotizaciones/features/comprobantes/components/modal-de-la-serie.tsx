'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { SERIE_MAXIMA, type SerieVigente } from '../../../entities/comprobantes/serie'
import { useModalDeLaSerie } from '../hooks/use-modal-de-la-serie'

type Props = { abierto: boolean; alCerrar: () => void; vigente: SerieVigente }

const AYUDA =
  'De 1 a 12 letras, números o guiones. Una serie nueva empieza en 1; volver a una usada sigue su numeración.'

// «Cambiar serie» (`?panel=serie`): cada apertura empieza de la serie vigente.
export function ModalDeLaSerie(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLaSerie key={apertura} {...props} />
}

function FormularioDeLaSerie({ abierto, alCerrar, vigente }: Props) {
  const modal = useModalDeLaSerie({ abierto, alCerrar, vigente })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="serie-de-comprobantes"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Cambiar serie"
      descripcion="La serie con la que se numeran los comprobantes que se emitan desde ahora."
      formulario={formulario}
      detalleDelConflicto="Recargar trae la serie de ahora y conserva lo que escribiste."
    >
      <Campo
        nombre="serie"
        etiqueta="Serie"
        value={modal.serie}
        maxLength={SERIE_MAXIMA}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        disabled={formulario.enCurso}
        ayuda={AYUDA}
        error={formulario.errores['serie']}
        onChange={(evento) => {
          modal.cambiarSerie(evento.target.value)
        }}
      />
    </ModalDeFormulario>
  )
}
