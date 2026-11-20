'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { MOTIVO_MONEDA_BASE_CON_DATOS } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'
import { useGuardarTarjeta } from '../hooks/use-guardar-tarjeta'
import { SeleccionEscrita } from './campos-del-modal'
import { CONFLICTO_DE_AJUSTES, type PropsDeModalDeAjustes } from './modal-de-identidad'

type Props = PropsDeModalDeAjustes & {
  // Con vehículos, cotizaciones o gastos cargados la base ya no se cambia.
  conDatosCargados: boolean
  // Las monedas activas, y la base aunque no lo esté: entre ellas se elige.
  monedas: readonly Moneda[]
}

// «Cambiar» la moneda base (`?panel=moneda-base`). Con datos cargados se ve, apagada y con su motivo. Cada apertura empieza de lo guardado.
export function ModalDeMonedaBase(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeMonedaBase key={apertura} {...props} />
}

function FormularioDeMonedaBase({ monedas, ...props }: Props) {
  const formulario = useGuardarTarjeta({ tarjeta: 'moneda-base', ...props })
  const { conDatosCargados } = props
  return (
    <ModalDeFormulario
      id="ajustes-moneda-base"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Moneda base"
      descripcion="La moneda en la que se guardan los montos."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES}
    >
      <SeleccionEscrita
        formulario={formulario}
        campo="monedaBase"
        etiqueta="Moneda base"
        disabled={conDatosCargados || formulario.enCurso}
        opciones={monedas.map((moneda) => ({
          valor: moneda.codigo,
          etiqueta: `${moneda.codigo} · ${moneda.nombre}`,
        }))}
        ayuda={
          conDatosCargados
            ? MOTIVO_MONEDA_BASE_CON_DATOS
            : 'Elígela antes de cargar datos: después no se cambia.'
        }
      />
    </ModalDeFormulario>
  )
}
