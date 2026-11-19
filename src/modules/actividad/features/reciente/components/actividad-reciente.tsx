import type { Route } from 'next'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'
import { leerActividadReciente } from '../../../composicion'
import { CLAVE_DE_CAMBIO } from '../../../entities/actividad'
import { rutaDeActividadDe } from '../../../entities/filtros'
import { fraseDeActividad } from '../../../entities/frase'
import { TAMANO_DE_ACTIVIDAD_RECIENTE } from '@/shared/lib/paginacion'
import { FraseDeActividad } from '../../frase/components/frase-de-actividad'
import { IconoDeEntidad } from '../../frase/components/icono-de-entidad'
import { ErrorDeActividadReciente } from './error-de-actividad-reciente'
import { FilasDelEsqueleto } from './esqueleto-de-actividad-reciente'

type Props = {
  // La tabla y el id del registro (`vehiculos`, `leads`…), como en `rutaDeActividadDe()`.
  tabla: string
  registroId: string
  // Los de la sesión: sin `actividad.ver` no se dibuja nada.
  permisos: Permisos
  // La zona de la empresa y `ajustes_empresa.actividad_dias`.
  zona: string
  diasDeActividad: number
}

const TITULO = 'actividad-reciente'

// Los últimos cambios de un registro como frases (`docs/UX.md` › «Actividad»), para la ficha que lo monte: cada una lleva a ese cambio
// desplegado en `/actividad` y «Ver toda la actividad», al filtro del registro. Va en el servidor, tras `<Suspense>` con su esqueleto; sin JS
// propio salvo el «Reintentar» del error.
export function ActividadReciente(props: Props) {
  if (!puede(props.permisos, 'actividad.ver')) {
    return null
  }
  return (
    <section aria-labelledby={TITULO} className="grid min-w-0 gap-2">
      <TituloDeBloqueConAccion
        id={TITULO}
        titulo="Actividad reciente"
        accion={
          <Link
            href={rutaDeActividadDe(props.tabla, props.registroId) as Route}
            className="min-h-11 content-center text-(length:--text-sm) text-(--color-primario-ink) underline underline-offset-2 md:min-h-0"
          >
            Ver toda la actividad
          </Link>
        }
      />
      <Suspense fallback={<FilasDelEsqueleto />}>
        <Contenido {...props} />
      </Suspense>
    </section>
  )
}

function Lista({ children }: { children: ReactNode }) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      {children}
    </ol>
  )
}

async function Contenido({ tabla, registroId, zona, diasDeActividad }: Props) {
  const lectura = await leerActividadReciente(tabla, registroId)
  if (!lectura.ok) {
    return <ErrorDeActividadReciente />
  }
  const filas = lectura.data.filas.slice(0, TAMANO_DE_ACTIVIDAD_RECIENTE)
  if (filas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Sin cambios en los últimos {diasDeActividad} días.
      </p>
    )
  }
  const base = rutaDeActividadDe(tabla, registroId)
  return (
    <Lista>
      {filas.map((fila) => {
        // El registro es el de la ficha: la frase no lo enlaza (toda la fila lleva al cambio en `/actividad`).
        const frase = fraseDeActividad(fila)
        const sinEnlace = { ...frase, registro: { ...frase.registro, enlace: null } }
        return (
          <li key={fila.id} className="min-w-0">
            <Link
              href={`${base}&${CLAVE_DE_CAMBIO}=${String(fila.id)}` as Route}
              className="flex min-w-0 items-start gap-3 px-3 py-2.5 outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus)"
            >
              <IconoDeEntidad icono={frase.icono} />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <FraseDeActividad frase={sinEnlace} zona={zona} />
                <time
                  dateTime={fila.creadoEn}
                  className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
                >
                  {formatearFecha(fila.creadoEn, { zona })} {formatearHora(fila.creadoEn, { zona })}
                </time>
              </div>
            </Link>
          </li>
        )
      })}
    </Lista>
  )
}
