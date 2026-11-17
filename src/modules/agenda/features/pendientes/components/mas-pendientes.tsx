'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { textoDelTopeDePendientes, type GrupoDePendientes } from '../../../entities/pendientes'
import type { BaseDeEnlace } from '../../calendario/enlace-de-panel'
import type { CompletarPendiente } from '../hooks/use-completar-pendiente'
import { usePaginasDePendientes } from '../hooks/use-paginas-de-pendientes'
import { FilaDePendiente } from './fila-de-pendiente'

export type PropsDeMasPendientes = {
  grupo: GrupoDePendientes
  desdeEn: string
  desdeId: string
  hasta: string
  yaCargadas: number
  base: BaseDeEnlace
  ahora: string
  zona: string
  completar: CompletarPendiente
}

// Lo que sigue de un grupo tras «Ver más»: sus filas, «Ver más» otra vez, el error con «Reintentar» (sin perder lo cargado) y, en el tope, el aviso. Viaja
// con `diferido()`: la lectura del navegador (supabase-js) se paga recién al tocar «Ver más».
export function MasPendientes({ yaCargadas, ...props }: PropsDeMasPendientes) {
  const paginas = usePaginasDePendientes({
    grupo: props.grupo,
    desdeEn: props.desdeEn,
    desdeId: props.desdeId,
    hasta: props.hasta,
    yaCargadas,
  })
  return (
    <>
      {paginas.filas.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)]">
          {paginas.filas.map((pendiente) => (
            <FilaDePendiente
              key={pendiente.id}
              grupo={props.grupo}
              pendiente={pendiente}
              base={props.base}
              ahora={props.ahora}
              zona={props.zona}
              completar={props.completar}
            />
          ))}
        </ul>
      ) : null}
      {paginas.error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {paginas.error.mensaje}
          </p>
          <Button variant="outline" className="min-h-11 md:min-h-9" onClick={paginas.reintentar}>
            Reintentar
          </Button>
        </div>
      ) : paginas.enElTope && paginas.hayMas ? (
        <AvisoDeTope texto={textoDelTopeDePendientes(props.grupo, TOPE_DE_LO_CARGADO)} />
      ) : paginas.cargando || paginas.hayMas ? (
        <Button
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={paginas.cargando}
          onClick={paginas.verMas}
        >
          {paginas.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </>
  )
}
