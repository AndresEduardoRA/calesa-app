'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_ACTIVIDAD_RECIENTE } from '@/shared/lib/paginacion'
import { EstadoError } from '@/shared/ui/estados/estado-error'
import { leerActividadReciente } from '../../../composicion.client'
import type { PaginaDeActividad } from '../../../entities/actividad'
import { FilasDelEsqueleto } from './esqueleto-de-actividad-reciente'
import { FilasDeActividadReciente, SinCambiosRecientes } from './filas-de-actividad-reciente'

type Props = {
  tabla: string
  registroId: string
  zona: string
  diasDeActividad: number
}

// Las filas de la «Actividad reciente» leídas desde el navegador (`actividad_listar` por el índice del registro: pide una de más para saber si hay
// más): el esqueleto, las filas, «Sin cambios en los últimos N días.» o el error con «Reintentar», que vuelve a pedir.
export function ListaRecienteDelNavegador({ tabla, registroId, zona, diasDeActividad }: Props) {
  const [lectura, setLectura] = useState<Resultado<PaginaDeActividad> | null>(null)
  const pedir = () => {
    void leerActividadReciente(tabla, registroId).then(setLectura)
  }
  const pedirAlMontar = useEffectEvent(pedir)
  useEffect(() => {
    pedirAlMontar()
  }, [])
  // «Reintentar»: el esqueleto otra vez mientras vuelve a pedir.
  const reintentar = () => {
    setLectura(null)
    pedir()
  }
  if (lectura === null) {
    return <FilasDelEsqueleto />
  }
  if (!lectura.ok) {
    return (
      <div role="alert">
        <EstadoError compacto titulo="No se pudo cargar la actividad" alReintentar={reintentar} />
      </div>
    )
  }
  const filas = lectura.data.filas.slice(0, TAMANO_DE_ACTIVIDAD_RECIENTE)
  if (filas.length === 0) {
    return <SinCambiosRecientes diasDeActividad={diasDeActividad} />
  }
  return (
    <FilasDeActividadReciente tabla={tabla} registroId={registroId} filas={filas} zona={zona} />
  )
}
