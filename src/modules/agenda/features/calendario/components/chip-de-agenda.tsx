'use client'

import type { Route } from 'next'
import { CheckIcon } from 'lucide-react'
import Link from 'next/link'
import { abreviaturaDeZona, formatearHora } from '@/shared/lib/fechas'
import { CLASES_DE_VISTO, SufijoDeVisto, useVistoDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { claseDe, type ClaveDeClase, type EntradaDeAgenda } from '../../../entities/agenda'

// Un color por clase, de los tokens de siempre (nunca sólo color: el chip dice su clase con texto).
const ESTILO_DE_CLASE: Record<ClaveDeClase, string> = {
  evento: 'bg-(--color-info-soft) text-(--color-info-ink)',
  tarea: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
  recordatorio: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)',
  subasta: 'bg-(--color-visitado-soft) text-(--color-ink)',
}

type Props = {
  entrada: EntradaDeAgenda
  // La zona de la empresa: la hora no es la del navegador ni la del servidor.
  zona: string
}

// La hora: la de una subasta va en la zona de quien mira, con su abreviatura (corre en la hora del patio); lo demás, en la de la empresa.
function HoraDelChip({ entrada, zona }: Props) {
  const { zonaDeLaPersona } = useRegional()
  if (entrada.clave !== 'subasta') {
    return <span className="tabular-nums">{formatearHora(entrada.instante, { zona })}</span>
  }
  return (
    <span className="tabular-nums">
      {formatearHora(entrada.instante, { zona: zonaDeLaPersona })}{' '}
      {abreviaturaDeZona(entrada.instante, { zona: zonaDeLaPersona })}
    </span>
  )
}

// Una cosa de la agenda, en un día. Lleva su clase con texto, la hora y el título; con `ruta` es un enlace (al panel del evento o de la tarea, o al
// vehículo de la subasta). Un evento o una tarea ya abiertos se marcan «visto» (la tilde y el texto para el lector: el tono del chip es el de su
// clase y apagarlo rompería el contraste) y el último, con el borde de acento y «Último visto».
export function ChipEvento({ entrada, zona }: Props) {
  const clase = claseDe(entrada.clave)
  const visto = useVistoDeLista(entrada.id)
  const contenido = (
    <>
      {visto === 'visto' || visto === 'ultimo' ? (
        <CheckIcon aria-hidden className="mr-1 inline size-3.5 align-text-bottom" />
      ) : null}
      <span className="font-semibold">{clase.nombre}</span>{' '}
      <HoraDelChip entrada={entrada} zona={zona} />{' '}
      <span className={entrada.hecha ? 'line-through' : undefined}>{entrada.titulo}</span>
      {entrada.hecha ? <span> · Hecha</span> : null}
      {entrada.detalle ? <span className="sr-only"> ({entrada.detalle})</span> : null}
      <SufijoDeVisto id={entrada.id} />
    </>
  )
  const estilo = `block min-w-0 rounded-md px-2 py-1 text-(length:--text-sm) break-words ${ESTILO_DE_CLASE[entrada.clave]} ${CLASES_DE_VISTO}`
  return entrada.ruta ? (
    <Link
      href={entrada.ruta as Route}
      data-visto={visto ?? undefined}
      title={entrada.detalle ?? undefined}
      className={`${estilo} transition hover:brightness-95 max-md:min-h-11`}
    >
      {contenido}
    </Link>
  ) : (
    <span title={entrada.detalle ?? undefined} data-visto={visto ?? undefined} className={estilo}>
      {contenido}
    </span>
  )
}
