'use client'

import { useEffect, useState } from 'react'
import { EstadoError, EstadoSinPermiso } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import type { AvisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import type { ContextoDeLaCotizacion } from '../../../entities/tarjeta/contexto-de-la-cotizacion'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import type { EstadoDeLaLectura } from '../hooks/use-lectura-de-la-tarjeta'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

function EsqueletoDeLaTarjeta() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, 300)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando la tarjeta" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
        </>
      ) : null}
    </div>
  )
}

// Lo que el modal dice fuera de la tarjeta: la tarjeta es lo que ve el cliente y no lleva avisos de trabajo (tampoco «Vencida», D7 de T310).
function Avisos({
  lectura,
  aviso,
  idDelDesactualizado,
  avisos,
  vencida,
}: {
  lectura: LecturaDeLaTarjeta
  aviso: AvisoDelTotal
  idDelDesactualizado: string
  avisos: PropsDeLaVistaPrevia['avisos']
  // El día en que venció, ya formateado; nulo si no venció.
  vencida: string | null
}) {
  const textos = [
    aviso === 'desactualizado' ? 'Total desactualizado.' : null,
    vencida === null ? null : `Esta cotización venció el ${vencida}.`,
    lectura.estado === 'sin_plantilla'
      ? 'Este origen no tiene una plantilla de tarjeta para esta versión de la fórmula: la tarjeta va sólo con el total.'
      : null,
    avisos.difiere ? 'Lo de hoy no es lo guardado: la tarjeta muestra lo guardado.' : null,
    avisos.cambiosSinGuardar
      ? 'Tus cambios sin guardar no están en la tarjeta: guarda para verlos.'
      : null,
  ].filter((t) => t !== null)
  return (
    <div role="status" className="grid gap-1">
      {textos.map((texto) => (
        <p
          key={texto}
          id={texto === 'Total desactualizado.' ? idDelDesactualizado : undefined}
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {texto}
        </p>
      ))}
    </div>
  )
}

export type PropsDelCuerpo = {
  estado: EstadoDeLaLectura
  reintentar: () => void
  lectura: LecturaDeLaTarjeta | null
  geometria: Geometria | null
  contexto: ContextoDeLaCotizacion
  aviso: AvisoDelTotal
  idDelDesactualizado: string
  avisos: PropsDeLaVistaPrevia['avisos']
  vencida: boolean
}

// El cuerpo de «Vista previa»: carga, sin permiso, error con «Reintentar» o la tarjeta (con sus retoques) y los avisos de trabajo fuera de ella.
export function CuerpoDeLaVistaPrevia({
  estado,
  reintentar,
  lectura,
  geometria,
  contexto,
  aviso,
  idDelDesactualizado,
  avisos,
  vencida,
}: PropsDelCuerpo) {
  if (estado.tipo === 'cargando') {
    return <EsqueletoDeLaTarjeta />
  }
  if (estado.tipo === 'sin_permiso') {
    return <EstadoSinPermiso titulo="No puedes ver la tarjeta de esta cotización." />
  }
  if (estado.tipo === 'error' || lectura === null || geometria === null) {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudo leer la tarjeta." alReintentar={reintentar} />
      </div>
    )
  }
  return (
    <div className="grid min-w-0 gap-3">
      <Avisos
        lectura={lectura}
        aviso={aviso}
        idDelDesactualizado={idDelDesactualizado}
        avisos={avisos}
        vencida={vencida ? (contexto.venceEl ?? '') : null}
      />
      <TarjetaDeCotizacion geometria={geometria} logo={contexto.logo} />
    </div>
  )
}
