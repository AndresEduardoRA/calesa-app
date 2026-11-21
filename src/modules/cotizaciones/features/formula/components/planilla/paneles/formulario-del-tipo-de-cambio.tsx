'use client'

import { useId, useState } from 'react'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { PedidoDeTipo } from '../../../../../entities/formula/tipo-de-celda'
import type { TipoDeCambioDeLaEmpresa } from '../tipos'
import { MarcoDelTipo } from './marco-del-tipo'

type Props = {
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
  inicial: string
  motivo: string | null
  alAplicar: (pedido: PedidoDeTipo) => void
  alCancelar: () => void
}

// «Tipo de celda › Tipo de cambio»: uno de los tipos de cambio de la empresa (salen de la base, por su clave).
export function FormularioDelTipoDeCambio({
  tiposDeCambio,
  inicial,
  motivo,
  alAplicar,
  alCancelar,
}: Props) {
  const uid = useId()
  const [clave, setClave] = useState(inicial)
  const opciones = [
    { valor: '', etiqueta: 'Elige un tipo de cambio', deshabilitada: true },
    ...tiposDeCambio.map((t) => ({ valor: t.clave, etiqueta: t.nombre })),
  ]
  return (
    <MarcoDelTipo
      hayCambios={clave !== inicial}
      motivo={motivo}
      listo={clave !== ''}
      alEnviar={() => {
        alAplicar({ tipo: 'tipo_de_cambio', clave })
      }}
      alCancelar={alCancelar}
    >
      <CampoSeleccion
        nombre={`${uid}-clave`}
        etiqueta="Tipo de cambio"
        ayuda={
          tiposDeCambio.length === 0
            ? 'La empresa aún no tiene tipos de cambio: se crean en Empresa › Monedas.'
            : 'Su valor es el de la empresa el día que se cotiza.'
        }
        opciones={opciones}
        value={clave}
        onChange={(e) => {
          setClave(e.target.value)
        }}
      />
    </MarcoDelTipo>
  )
}
