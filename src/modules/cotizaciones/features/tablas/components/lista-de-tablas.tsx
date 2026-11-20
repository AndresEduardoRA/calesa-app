'use client'

import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { TOPE_DE_TABLAS, type TablaDeReferencia } from '../../../entities/tablas/lectura'
import {
  origenIdDelDestino,
  rutaDeLasTablas,
  type DestinoDeLasTablas,
} from '../../../entities/tablas/rutas'

type Props = {
  destino: DestinoDeLasTablas
  lectura: { tablas: readonly TablaDeReferencia[]; hayMas: boolean }
}

function Publicada({ tabla }: { tabla: TablaDeReferencia }) {
  const { zonaHoraria, locale } = useRegional()
  const partes = [
    `Versión ${formatearNumero(tabla.version, { locale, decimales: 0 })}`,
    tabla.publicadoPor,
    tabla.publicadoEn ? fechaRelativa(tabla.publicadoEn, { zona: zonaHoraria }) : null,
  ].filter((parte): parte is string => parte !== null)
  return <p className="text-(--color-ink-soft)">{partes.join(' · ')}</p>
}

// La lista de tablas de referencia (4.23-3, C3): las de un origen y las compartidas que usa, o sólo las compartidas. Cada tabla abre su editor. Las tablas nuevas y
// sus columnas se crean por SQL (P5 del 4.23-1).
export function ListaDeTablas({ destino, lectura }: Props) {
  const { locale } = useRegional()
  const origen = destino === 'compartidas' ? null : destino.origen
  const origenId = origenIdDelDestino(destino)
  return (
    <>
      {lectura.tablas.length === 0 ? (
        <div className="grid gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)">
          <p className="text-(--color-ink)">
            {origen
              ? `${origen.nombre} no tiene tablas de referencia.`
              : 'No hay tablas compartidas.'}
          </p>
          <p className="text-(--color-ink-soft)">
            Las tablas nuevas y sus columnas todavía no se crean desde aquí.
          </p>
        </div>
      ) : (
        <ul
          aria-label={origen ? `Tablas de referencia de ${origen.nombre}` : 'Tablas compartidas'}
          className="grid grid-cols-[minmax(0,1fr)] gap-2"
        >
          {lectura.tablas.map((tabla) => (
            <li
              key={tabla.id}
              className="grid min-w-0 gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={rutaDeLasTablas(origenId, tabla.id)}
                  className="font-semibold break-words text-(--color-ink) underline-offset-4 hover:underline"
                >
                  {tabla.nombre}
                </Link>
                <span className="break-all text-(--color-ink-faint)">{tabla.clave}</span>
                {origen && tabla.compartida ? <Badge variant="secondary">Compartida</Badge> : null}
                {origen && tabla.tapada ? (
                  <Badge variant="outline">Tapada por la de {origen.nombre}</Badge>
                ) : null}
              </div>
              <Publicada tabla={tabla} />
            </li>
          ))}
        </ul>
      )}
      {lectura.hayMas ? (
        <AvisoDeTope
          texto={`Mostrando las ${formatearNumero(TOPE_DE_TABLAS, { locale, decimales: 0 })} primeras tablas.`}
        />
      ) : null}
    </>
  )
}
