import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { useAhora } from '@/shared/ui/use-ahora'
import { useRegional } from '@/shared/ui/regional'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'
import type { FilaDeLead } from '../../../entities/listado'
import {
  rutaDelRecordatorioDeFila,
  rutaDelSeguimientoDeFila,
  textoDelRecordatorio,
  textoDelUltimoSeguimiento,
  tipoDeSeguimientoDelCatalogo,
  type TipoDeSeguimientoEnCatalogo,
} from '../../../entities/ultimo-contacto'

// Lo que el listado le pasa a todas sus filas: los tipos de seguimiento (nombre e icono) y el instante de la página (ISO, el del servidor).
export type DatosDeUltimoContacto = {
  tipos: readonly TipoDeSeguimientoEnCatalogo[]
  ahora: string
}

// Lo que el listado necesita para decir «hace X»: los tipos de seguimiento (nombre e icono), el instante contra el que se cuenta (avanza cada minuto) y
// la zona de la empresa.
export type ParaUltimoContacto = {
  tipos: readonly TipoDeSeguimientoEnCatalogo[]
  ahora: Date
  zona: string
}

const ENLACE =
  'rounded-(--radius-sm) text-(--color-ink) underline-offset-2 hover:underline focus-visible:underline'

// El último seguimiento del lead en dos líneas: arriba su tipo (con el icono del catálogo) y su título, debajo «hace 3 días». Un clic abre la ficha en sus
// seguimientos. Si el último es privado de otra persona sólo se dice «hace X» (la fecha es pública). Sin seguimientos, el texto «Sin seguimientos»: crear uno
// es del «⋯» (una sola puerta por acción).
export function UltimoSeguimientoDeFila({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  const { ultimoSeguimientoEn: en, ultimoSeguimiento: detalle } = lead
  if (en === null) {
    return <span className="text-(length:--text-xs) text-(--color-ink-soft)">Sin seguimientos</span>
  }
  const cuando = textoDelUltimoSeguimiento(en, contexto)
  const tipo = detalle ? tipoDeSeguimientoDelCatalogo(contexto.tipos, detalle.tipoId) : null
  // Pocos nodos (cada fila de 100 paga cada uno): el enlace es la cuadrícula de dos columnas (icono y título arriba, la hora bajo el título) y
  // el título se corta; la hora, no.
  return (
    <Link
      href={rutaDelSeguimientoDeFila(lead.id) as Route}
      className={cn('grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1', ENLACE)}
      data-ultimo-seguimiento=""
    >
      {detalle ? (
        <>
          <IconoDelCatalogo clave={tipo?.icono} className="size-3.5" deLista />
          <span className="min-w-0 truncate text-(length:--text-sm)">
            {tipo ? `${tipo.nombre}: ` : ''}
            {detalle.titulo}
          </span>
        </>
      ) : null}
      <span
        className={cn(
          'text-(length:--text-xs) text-(--color-ink-soft)',
          detalle ? 'col-start-2' : 'col-span-2',
        )}
      >
        {cuando}
      </span>
    </Link>
  )
}

// El próximo recordatorio de quien mira sobre el lead en dos líneas: arriba de qué es, debajo «en 2 días»; vencido, resaltado y dicho con texto («vencido hace
// 1 día»). Un clic lo abre. Sin recordatorio, un guion: agendarlo es del «⋯».
export function RecordatorioDeFila({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  const recordatorio = lead.proximoRecordatorio
  if (recordatorio === null) {
    return (
      <span role="img" aria-label="Sin recordatorio" className="text-(--color-ink-faint)">
        —
      </span>
    )
  }
  const { texto, vencido } = textoDelRecordatorio(recordatorio.recordarEn, contexto)
  return (
    <Link
      href={rutaDelRecordatorioDeFila(lead.id, lead.enCartera, recordatorio.id) as Route}
      className={cn('grid min-w-0 items-center', ENLACE)}
      data-recordatorio-de-fila=""
      data-vencido={vencido ? 'true' : undefined}
    >
      <span className="min-w-0 truncate text-(length:--text-sm)">{recordatorio.titulo}</span>
      <span
        className={cn(
          'w-fit text-(length:--text-xs)',
          vencido
            ? 'rounded-(--radius-sm) bg-(--color-aviso-soft) px-1 font-medium text-(--color-aviso-ink)'
            : 'text-(--color-ink-soft)',
        )}
      >
        {texto}
      </span>
    </Link>
  )
}

// El contexto de la lista: el reloj (uno solo, cada minuto), los tipos de seguimiento y la zona de la empresa; el mismo para todas las filas.
export function useContextoDeUltimoContacto(datos: DatosDeUltimoContacto): ParaUltimoContacto {
  const ahora = useAhora(datos.ahora)
  const { zonaHoraria: zona } = useRegional()
  return { tipos: datos.tipos, ahora, zona }
}

// Los dos datos en la tarjeta del celular: dos columnas con su rótulo arriba (una sola con el texto al 200 %). `dt` y `dd` van sin envoltorio
// (`grid-flow-col` los acomoda de a dos por columna): cada tarjeta de 100 paga cada nodo (`docs/RENDIMIENTO.md`).
export function UltimoContactoDeTarjeta({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  return (
    <dl className="grid grid-flow-col grid-cols-2 grid-rows-[auto_1fr] gap-x-3 border-t border-(--color-line) pt-2 @max-[16rem]:grid-flow-row @max-[16rem]:grid-cols-1 @max-[16rem]:grid-rows-none">
      <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
        Último seguimiento
      </dt>
      <dd className="min-w-0">
        <UltimoSeguimientoDeFila lead={lead} contexto={contexto} />
      </dd>
      <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">Recordatorio</dt>
      <dd className="min-w-0">
        <RecordatorioDeFila lead={lead} contexto={contexto} />
      </dd>
    </dl>
  )
}
