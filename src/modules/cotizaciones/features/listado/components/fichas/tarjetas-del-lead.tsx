'use client'

import { useEffect, useEffectEvent } from 'react'
import { rutaDelListado } from '../../../../entities/ruta-de-la-hoja'
import { useTarjetasDelLead } from '../../hooks/use-tarjetas-del-lead'
import { TarjetasDeLaFicha, type PropsDeTarjetasDeLaFicha } from './tarjetas-de-la-ficha'

export type PropsDeLasTarjetasDelLead = Pick<
  PropsDeTarjetasDeLaFicha,
  'Imagen' | 'compartir' | 'dialogos'
> & { leadId: string }

// Las cotizaciones de la ficha del lead: las últimas 10 que quien mira ve (la RLS recorta), la más reciente primero, en una fila de tarjetas con «Ver más» a
// `/cotizaciones?lead=` si hay más. Se lee al montarse, desde el navegador. Quien la monta pone `key={leadId}`.
export function TarjetasDelLead({
  leadId,
  Imagen,
  compartir,
  dialogos,
}: PropsDeLasTarjetasDelLead) {
  const lectura = useTarjetasDelLead(leadId)
  const leerAlMontar = useEffectEvent(lectura.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  const { leido } = lectura
  return (
    <TarjetasDeLaFicha
      etiqueta="Cotizaciones del lead"
      tituloDelError="No pudimos cargar las cotizaciones."
      lectura={{
        leida: leido !== null,
        fallo: lectura.error !== null,
        alReintentar: lectura.reintentar,
      }}
      filas={leido?.filas ?? []}
      verMas={leido?.hayMas === true ? rutaDelListado({ lead: leadId }) : null}
      Imagen={Imagen}
      compartir={compartir}
      dialogos={dialogos}
    />
  )
}
