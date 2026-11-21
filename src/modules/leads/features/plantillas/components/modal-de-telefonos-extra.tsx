'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Switch } from '@/shared/ui/switch'
import { useApertura } from '@/shared/ui/use-apertura'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useModalDeTelefonosExtra } from '../hooks/use-modal-de-telefonos-extra'

const ID_DEL_MAXIMO = 'telefonos-extra-maximo'

type Props = {
  abierto: boolean
  alCerrar: () => void
  telefonos: AjustesDeLeads['telefonos']
}

// «Teléfonos extra» (`?panel=telefonos`): cuántos teléfonos extra admite un lead y si cuentan como el principal. Cada apertura empieza de lo guardado.
export function ModalDeTelefonosExtra(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeTelefonos key={apertura} {...props} />
}

function FormularioDeTelefonos({ abierto, alCerrar, telefonos }: Props) {
  const modal = useModalDeTelefonosExtra({ telefonos, abierto, alCerrar })
  const idRegla = useId()
  const idAyuda = `${idRegla}-ayuda`
  // El `Switch` es un `span` con rol: el `htmlFor` de la etiqueta no le da nombre.
  const idEtiqueta = `${idRegla}-etiqueta`
  return (
    <ModalDeFormulario
      id="telefonos-extra"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Teléfonos extra"
      focoInicial={() => document.getElementById(ID_DEL_MAXIMO)}
      formulario={modal.formulario}
      detalleDelConflicto="Lo que escribiste sigue acá."
    >
      <Campo
        nombre={ID_DEL_MAXIMO}
        etiqueta="Máximo de teléfonos extra"
        inputMode="numeric"
        autoComplete="off"
        value={modal.maximo}
        onChange={(evento) => {
          modal.escribirMaximo(evento.target.value)
        }}
        error={modal.motivo ?? undefined}
        ayuda="De 0 a 20. Los leads que ya tengan más los conservan; no se les agregan más hasta quedar por debajo."
      />
      <div className="grid gap-1.5">
        <div className="flex min-h-11 items-center gap-2 md:min-h-8">
          <Switch
            id={idRegla}
            checked={modal.comoPrincipal}
            aria-labelledby={idEtiqueta}
            aria-describedby={idAyuda}
            onCheckedChange={modal.cambiarRegla}
          />
          <Label id={idEtiqueta} htmlFor={idRegla}>
            Los teléfonos extra cuentan como el principal
          </Label>
        </div>
        <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
          Un teléfono extra no podrá repetirse en otro lead y registrar ese número encontrará a este
          lead. Lo que ya se repite queda como está.
        </p>
      </div>
    </ModalDeFormulario>
  )
}
