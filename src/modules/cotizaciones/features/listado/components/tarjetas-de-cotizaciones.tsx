'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, SufijoDeVisto, TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { tituloDeLaCotizacion } from '../../../entities/titulo-de-la-cotizacion'
import {
  nombreDelOrigen,
  SIN_NOMBRE,
  type FilaDeCotizacion,
  type MenuDeFila,
  type OrigenDelListado,
} from './tipos'
import { Vigencia } from './vigencia'

type Props = {
  cotizaciones: readonly FilaDeCotizacion[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
  // El «⋯» de cada tarjeta; sin él no hay botón.
  menuDeFila?: MenuDeFila | undefined
}

// El título de la cotización (`tituloDeLaCotizacion()`) bajo «N.º n», en dos líneas como mucho y entero en `title`; el de respaldo es el número, que ya está.
function TituloDeLaTarjeta({ cotizacion }: { cotizacion: FilaDeCotizacion }) {
  const titulo = tituloDeLaCotizacion(cotizacion)
  return titulo === null || titulo.fuente === 'numero' ? null : (
    <p
      data-titulo-de-la-cotizacion=""
      title={titulo.texto}
      className="line-clamp-2 text-(length:--text-sm) break-words text-(--color-ink)"
    >
      {titulo.texto}
    </p>
  )
}

// Las cotizaciones de la página en el celular: una tarjeta por cotización, con lo mismo que la fila de la tabla. Un toque en la tarjeta abre el resumen; «N.º n» arriba es su botón (`<AbrirResumen>`) y el «⋯» de la derecha, sus acciones (T15).
export function TarjetasDeCotizaciones({
  cotizaciones,
  origenes,
  alAbrir,
  abierta,
  menuDeFila,
}: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {cotizaciones.map((cotizacion) => (
        <TarjetaDeLista
          key={cotizacion.id}
          idDeVisto={cotizacion.id}
          abierta={abierta === cotizacion.id}
          acciones={menuDeFila?.(cotizacion)}
          alAbrir={() => {
            alAbrir(cotizacion.id)
          }}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <AbrirResumen
              nombre={`N.º ${String(cotizacion.numero)}`}
              className="font-medium text-(--color-ink) tabular-nums"
            >
              N.º {cotizacion.numero}
            </AbrirResumen>
            {/* Fuera del botón: su `aria-label` tapa a los hijos. */}
            <SufijoDeVisto id={cotizacion.id} />
            <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
            {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
            <span className="ml-auto font-medium tabular-nums">
              <Monto valor={cotizacion.totalBase} />
            </span>
          </div>
          <TituloDeLaTarjeta cotizacion={cotizacion} />
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            <span>Cliente: {cotizacion.cliente ?? SIN_NOMBRE}</span>
            {/* El vehículo no se repite si el título es su nombre. */}
            {cotizacion.vehiculo !== null &&
            cotizacion.vehiculo === tituloDeLaCotizacion(cotizacion)?.texto ? null : (
              <span>Vehículo: {cotizacion.vehiculo ?? SIN_NOMBRE}</span>
            )}
            <span>{nombreDelOrigen(origenes, cotizacion.origenId)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
            </span>
          </div>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
