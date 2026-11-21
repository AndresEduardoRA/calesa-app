'use client'

import { TarjetasDelLead } from '@/modules/cotizaciones/pantallas/listado-fichas'
import { ImagenDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta-imagen'
import {
  DialogoDeCompartirDeLaFila,
  useAbrirCompartirDeLaFila,
} from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import { useLive } from '@/shared/ui/live'

// Las cotizaciones del lead en tarjetas: el módulo de cotizaciones dibuja la fila y esta ruta le une lo del área `tarjeta` (la imagen de la tarjeta, «Compartir» y su diálogo),
// porque un área no importa otra. En Modo Live «Compartir» no se ofrece. La `key` empieza de cero con otro lead.
export function TarjetasDelLeadConCompartir({ leadId }: { leadId: string }) {
  const { live } = useLive()
  const abrirCompartir = useAbrirCompartirDeLaFila()
  return (
    <TarjetasDelLead
      key={leadId}
      leadId={leadId}
      Imagen={ImagenDeLaTarjeta}
      compartir={live ? null : abrirCompartir}
      dialogos={<DialogoDeCompartirDeLaFila />}
    />
  )
}
