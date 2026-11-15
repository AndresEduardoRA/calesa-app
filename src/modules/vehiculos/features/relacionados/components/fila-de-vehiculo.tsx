'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'
import type { FilaRelacionada, VehiculoRelacionado } from '../../../entities/relacionados'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { DetalleDeLaRelacion } from './detalle-de-la-relacion'

type Props = {
  fila: FilaRelacionada<VehiculoRelacionado>
  // Qué visor abre `?visor=`: el mismo vehículo puede estar en dos grupos, y con la misma clave se abrirían dos.
  claveDelVisor: string
  acciones: readonly AccionDeRelacionados[]
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
}

// Un vehículo relacionado a un lead: su miniatura (la galería abre el visor), su título enlazado a su ficha, su origen y lo propio de la relación.
export function FilaDeVehiculo({ fila, claveDelVisor, acciones, enCurso, alElegir }: Props) {
  const { contraparte: vehiculo, detalle } = fila
  return (
    <li className="flex min-w-0 items-start gap-2">
      <FotosEnElLugar
        vehiculo={{
          id: vehiculo.vehiculoId,
          titulo: vehiculo.titulo,
          portadaRuta: vehiculo.portada,
        }}
        modo="abrir"
        clave={claveDelVisor}
        className="w-16 shrink-0"
      />
      <div className="grid min-w-0 flex-1 gap-0.5 text-(length:--text-sm)">
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <Link
            href={`${RUTAS.vehiculos}/${vehiculo.vehiculoId}` as Route}
            className="font-medium text-(--color-ink) underline-offset-2 hover:underline"
          >
            {vehiculo.titulo}
          </Link>
        </span>
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">
          {vehiculo.origenNombre ? `${vehiculo.origenNombre} · ` : null}N.º {vehiculo.numero}
        </span>
        <DetalleDeLaRelacion detalle={detalle} />
      </div>
      <AccionesDeLaFila
        nombre={vehiculo.titulo}
        acciones={acciones}
        enCurso={enCurso}
        alElegir={alElegir}
      />
    </li>
  )
}
