'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { CabeceraPegada, CeldaPegada, FilaDeLista, TablaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
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
  // Con la selección activa (quien puede mover): la casilla de cada fila y la de la cabecera.
  seleccion: {
    elegido: (id: string) => boolean
    alternar: (vehiculo: VehiculoDeLaFase) => void
    elegirLaPagina: () => void
    paginaCompleta: boolean
  } | null
}

const SIN_DATO = <span className="text-(--color-ink-faint)">—</span>

// Los vehículos de la fase en escritorio, con el patrón de lista: el nombre es un enlace a la página del vehículo (`/logistica/vehiculo/<id>`) y un clic en el resto de la fila va ahí también.
// Nada de drawer. Columnas: casilla, vehículo (nombre, VIN y lote), estado, contenedor, booking y ETA.
export function TablaDeLaFase({ vehiculos, ahora, alAbrir, seleccion }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">
            <span className="flex items-center gap-2">
              {seleccion ? (
                <ElegirLaPagina
                  completa={seleccion.paginaCompleta}
                  alElegir={seleccion.elegirLaPagina}
                />
              ) : null}
              Vehículo
            </span>
          </CabeceraPegada>
          <TableHead>Estado</TableHead>
          <TableHead>Contenedor</TableHead>
          <TableHead>Booking</TableHead>
          <TableHead>ETA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehiculos.map((vehiculo) => (
          <FilaDeLista
            key={vehiculo.id}
            idDeVisto={vehiculo.id}
            alAbrir={() => {
              alAbrir(vehiculo.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <span className="flex items-start gap-2">
                {seleccion ? (
                  <CasillaDeLaFila
                    nombre={vehiculo.nombre}
                    elegida={seleccion.elegido(vehiculo.id)}
                    alAlternar={() => {
                      seleccion.alternar(vehiculo)
                    }}
                  />
                ) : null}
                <span className="grid min-w-0 gap-0.5 py-1">
                  <EnlaceALaUnidad id={vehiculo.id} nombre={vehiculo.nombre} />
                  {vehiculo.vin || vehiculo.lote ? (
                    <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
                      {[
                        vehiculo.vin ? `VIN ${vehiculo.vin}` : null,
                        vehiculo.lote ? `Lote ${vehiculo.lote}` : null,
                      ]
                        .filter((texto) => texto !== null)
                        .join(' · ')}
                    </span>
                  ) : null}
                </span>
              </span>
            </CeldaPegada>
            <TableCell>
              <EstadoEnLaFase
                vehiculo={vehiculo}
                dias={textoDeLosDiasEnLaFase(vehiculo.faseDesde, ahora)}
              />
            </TableCell>
            <TableCell className="whitespace-nowrap">{vehiculo.contenedor ?? SIN_DATO}</TableCell>
            <TableCell className="whitespace-nowrap">{vehiculo.booking ?? SIN_DATO}</TableCell>
            <TableCell className="whitespace-nowrap">
              {vehiculo.etaEl ? formatearFecha(vehiculo.etaEl, { zona: zonaHoraria }) : SIN_DATO}
            </TableCell>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
