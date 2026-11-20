import { ChevronLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { integracionActiva } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { pasosParaCotizarYMover } from '@/modules/origenes'
import { MenuDelOrigen, ParaCotizarYMover } from '@/modules/origenes/pantallas/origen'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { pestanasDelOrigen, puedeAbrirElOrigen } from '../acceso'
import { conDestino } from '../pasos'
import { leerElOrigen } from './abrir-origen'
import { PestanasDeLaRuta } from './pestanas-de-la-ruta'

// El encabezado de la página de un origen, común a sus seis pestañas: la vuelta a la lista; el punto de color, el nombre, «Activo» o
// «Inactivo» y, para quien gestiona orígenes, el «⋯» arriba a la derecha; «Para cotizar y mover» con un paso por pestaña (o «Inactivo»);
// y las pestañas, con las que no abre apagadas y su motivo. Para quien no abre el origen no dibuja nada: la pestaña dice por qué.
export async function MarcoDelOrigen({ id }: { id: string }) {
  // Sin esto, el armado del cascarón de un origen nuevo lee la sesión al prerenderizar (`Date.now()` de supabase-js).
  await connection()
  const sesion = await requerirSesion()
  if (!puedeAbrirElOrigen(sesion.permisos, id)) {
    return null
  }
  const origen = await leerElOrigen(id)
  const apibaraActiva = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  const tira = pasosParaCotizarYMover(origen, { apibaraActiva })
  return (
    <div className="grid min-w-0 gap-4">
      <Link
        href={RUTAS.origenes as Route}
        className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-(--radius-md) pr-2 pl-1 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-8"
      >
        <ChevronLeftIcon aria-hidden className="size-4 shrink-0" />
        Orígenes
      </Link>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          <h1 className="min-w-0 text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
            {origen.nombre}
          </h1>
          {origen.activo ? (
            <Badge className="bg-(--color-positivo-soft) text-(--color-positivo-ink)">Activo</Badge>
          ) : (
            <Badge variant="outline">Inactivo</Badge>
          )}
        </div>
        {puede(sesion.permisos, 'origenes.gestionar') ? <MenuDelOrigen origen={origen} /> : null}
      </div>
      {tira.inactivo ? (
        <ParaCotizarYMover inactivo />
      ) : (
        <ParaCotizarYMover pasos={conDestino(tira.pasos, sesion.permisos, origen.id)} />
      )}
      <PestanasDeLaRuta
        pestanas={pestanasDelOrigen(sesion.permisos, origen.id)}
        sinSegmento="datos"
      />
    </div>
  )
}
