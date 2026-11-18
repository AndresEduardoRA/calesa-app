'use client'

import { useMemo, useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import {
  contextoDeLaPagina,
  type ContextoDeLaCotizacion,
  type PaginaDeLaTarjeta,
} from '../../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { useTituloDeLaCotizacion } from '../../hoja/hooks/use-titulo-de-la-cotizacion'
import { useLecturaDeLaTarjeta, type EstadoDeLaLectura } from './use-lectura-de-la-tarjeta'

// Lo que la página sabe de la tarjeta y la hoja no. `titulo`: el de una guardada ya resuelto (el guardado, porque la tarjeta dibuja lo guardado); sin la prop, la
// hoja nueva, que lee el que se está escribiendo.
export type PaginaDelModelo = Omit<PaginaDeLaTarjeta, 'titulo'> & {
  titulo?: string | null
  vencida: boolean
}

type Entrada = {
  formulaId: string
  calculo: CalculoDeLaTarjeta
  monedaBs: string | null
  pagina: PaginaDelModelo
}

// Lo ahora, una vez por montaje: el modal se monta al abrirse y la fecha de hoy no cambia mientras está abierto.
function useHoy(): string {
  const [hoy] = useState(() => new Date().toISOString())
  return hoy
}

// La lectura de la tarjeta, el contexto de la cotización y su geometría: lo comparten el cuerpo del modal, que la dibuja, y su pie, que la copia. Sin lectura,
// la geometría es nula.
export function useModeloDeLaTarjeta({ formulaId, calculo, monedaBs, pagina }: Entrada): {
  estado: EstadoDeLaLectura
  reintentar: () => void
  lectura: LecturaDeLaTarjeta | null
  contexto: ContextoDeLaCotizacion
  geometria: Geometria | null
} {
  const { estado, reintentar } = useLecturaDeLaTarjeta(formulaId)
  const { zonaHoraria, locale } = useRegional()
  const hoy = useHoy()
  const vivo = useTituloDeLaCotizacion()?.mostrado ?? null
  const titulo = pagina.titulo === undefined ? vivo : pagina.titulo
  const contexto = useMemo(
    () => contextoDeLaPagina({ ...pagina, titulo }, { zona: zonaHoraria, hoy }),
    [pagina, titulo, zonaHoraria, hoy],
  )
  const lectura = estado.tipo === 'lista' ? estado.lectura : null
  const geometria = useMemo(
    () =>
      lectura === null
        ? null
        : geometriaDeLaTarjeta({ lectura, calculo, contexto, monedaBs, locale }),
    [lectura, calculo, contexto, monedaBs, locale],
  )
  return { estado, reintentar, lectura, contexto, geometria }
}
