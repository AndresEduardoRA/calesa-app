import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { Vehiculo } from '../../../entities/vehiculo'
import { vinOLote } from '../../../entities/vin-o-lote'
import { BadgeDeSituacion } from '../../listado/components/badge-de-situacion'
import { Miniatura } from '../../listado/components/miniatura'

type Props = {
  vehiculo: Pick<Vehiculo, 'id' | 'titulo' | 'vin' | 'lote' | 'portadaRuta' | 'situacion'>
  // El nombre de su origen; nulo = no se pudo leer (no se dibuja).
  origen: string | null
  // La fase del vehículo para su situación (nula = todavía sin fase); `situacion` nula = no se pudo leer y no se dibuja la insignia (decir «Sin fase» mentiría).
  situacion: { fase: { nombre: string; color: string } | null } | null
}

// El vehículo de un proyecto de repuestos, en su cabecera (`docs/UX.md` › «Repuestos: proyecto (estados propios)» › «Vehículo»): la miniatura de su portada (480 px; sin
// fotos, el marcador), el título enlazado a su ficha, el VIN o el lote, el origen y la situación. De servidor: no suma JS. Con el texto al 200 % la miniatura pasa arriba.
export function VehiculoEnLaCabecera({ vehiculo, origen, situacion }: Props) {
  const identidad = vinOLote(vehiculo)
  return (
    <div data-vehiculo-del-proyecto className="@container min-w-0">
      <div className="flex items-start gap-3 @max-[20rem]:flex-col">
        <Miniatura ruta={vehiculo.portadaRuta} className="w-24" />
        <div className="grid min-w-0 flex-1 gap-1 text-(length:--text-sm)">
          <Link
            href={`${RUTAS.vehiculos}/${vehiculo.id}` as Route}
            className="inline-flex min-h-11 items-center font-medium [overflow-wrap:anywhere] underline underline-offset-2 md:min-h-0"
          >
            {vehiculo.titulo}
          </Link>
          {identidad === null ? null : (
            <span className="[overflow-wrap:anywhere] text-(--color-ink-soft) tabular-nums">
              {identidad}
            </span>
          )}
          {origen === null && situacion === null ? null : (
            <div className="flex flex-wrap items-center gap-2">
              {origen === null ? null : <span className="text-(--color-ink-soft)">{origen}</span>}
              {situacion === null ? null : (
                <BadgeDeSituacion situacion={vehiculo.situacion} fase={situacion.fase} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
