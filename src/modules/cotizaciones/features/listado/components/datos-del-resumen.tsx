'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { tituloDeLaCotizacion } from '../../../entities/titulo-de-la-cotizacion'
import { SIN_NOMBRE, type FilaDeCotizacion } from './tipos'
import { Vigencia } from './vigencia'

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{nombre}</dt>
      <dd className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink)">
        {children}
      </dd>
    </div>
  )
}

// El título de la cotización (`tituloDeLaCotizacion()`): el suyo o el del vehículo; el de respaldo es el número, que ya dice el título del panel.
function TituloDelResumen({ cotizacion }: { cotizacion: FilaDeCotizacion }) {
  const titulo = tituloDeLaCotizacion(cotizacion)
  return titulo === null || titulo.fuente === 'numero' ? null : (
    <p
      data-titulo-de-la-cotizacion=""
      className="text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)"
    >
      {titulo.texto}
    </p>
  )
}

// Los datos de la fila en el resumen: el título (el número ya está en el del panel), la clase y «Aprobada», el total con su modo, y cliente, vehículo, quién y
// cuándo la creó y su vigencia.
export function DatosDelResumen({ cotizacion }: { cotizacion: FilaDeCotizacion }) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid gap-3">
      <TituloDelResumen cotizacion={cotizacion} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
        {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
      </div>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="text-(length:--text-lg) font-semibold text-(--color-ink) tabular-nums">
          <Monto valor={cotizacion.totalBase} />
        </span>
        {cotizacion.modo === null ? null : (
          <span data-modo-del-total="" className="text-(length:--text-xs) text-(--color-ink-soft)">
            {cotizacion.modo}
          </span>
        )}
      </p>
      <dl className="grid gap-3">
        <Dato nombre="Cliente">{cotizacion.cliente ?? SIN_NOMBRE}</Dato>
        <Dato nombre="Vehículo">{cotizacion.vehiculo ?? SIN_NOMBRE}</Dato>
        <Dato nombre="Creada">
          {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
        </Dato>
        <Dato nombre="Vigencia">
          <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
        </Dato>
      </dl>
    </div>
  )
}
