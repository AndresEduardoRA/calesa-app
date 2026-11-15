'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { textoDeLosDiasEnLaFase } from '../../../entities/cadena/dias'
import type { VehiculoDeLaFase } from '../../../entities/cadena/leer'
import { EnlaceALaUnidad } from '../../nucleo/components/enlace-a-la-unidad'
import { CasillaDeLaFila } from './casilla-de-la-fila'
import { ElegirLaPagina } from './elegir-la-pagina'
import { EstadoEnLaFase } from './estado-en-la-fase'

type Props = {
  vehiculos: readonly VehiculoDeLaFase[]
  ahora: Date
  alAbrir: (id: string) => void
  seleccion: {
    elegido: (id: string) => boolean
    alternar: (vehiculo: VehiculoDeLaFase) => void
    elegirLaPagina: () => void
    paginaCompleta: boolean
  } | null
}

// Los vehículos de la fase en el celular: una tarjeta por vehículo con lo mismo que la fila de la tabla. Un toque en el nombre o en la tarjeta abre su página.
export function TarjetasDeLaFase({ vehiculos, ahora, alAbrir, seleccion }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {seleccion ? (
        <label className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink)">
          <ElegirLaPagina completa={seleccion.paginaCompleta} alElegir={seleccion.elegirLaPagina} />
          Elegir los de esta página
        </label>
      ) : null}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {vehiculos.map((vehiculo) => {
          const transporte = [
            vehiculo.contenedor ? `Contenedor ${vehiculo.contenedor}` : null,
            vehiculo.booking ? `Booking ${vehiculo.booking}` : null,
            vehiculo.etaEl ? `ETA ${formatearFecha(vehiculo.etaEl, { zona: zonaHoraria })}` : null,
          ].filter((texto) => texto !== null)
          return (
            <TarjetaDeLista
              key={vehiculo.id}
              idDeVisto={vehiculo.id}
              alAbrir={() => {
                alAbrir(vehiculo.id)
              }}
              acciones={
                seleccion ? (
                  <CasillaDeLaFila
                    nombre={vehiculo.nombre}
                    elegida={seleccion.elegido(vehiculo.id)}
                    alAlternar={() => {
                      seleccion.alternar(vehiculo)
                    }}
                  />
                ) : undefined
              }
            >
              <EnlaceALaUnidad id={vehiculo.id} nombre={vehiculo.nombre} />
              {vehiculo.vin || vehiculo.lote ? (
                <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
                  {[
                    vehiculo.vin ? `VIN ${vehiculo.vin}` : null,
                    vehiculo.lote ? `Lote ${vehiculo.lote}` : null,
                  ]
                    .filter((texto) => texto !== null)
                    .join(' · ')}
                </p>
              ) : null}
              <EstadoEnLaFase
                vehiculo={vehiculo}
                dias={textoDeLosDiasEnLaFase(vehiculo.faseDesde, ahora)}
              />
              {transporte.length > 0 ? (
                <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
                  {transporte.join(' · ')}
                </p>
              ) : null}
            </TarjetaDeLista>
          )
        })}
      </ul>
    </div>
  )
}
