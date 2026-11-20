import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import type { OrigenAbierto } from './abrir-origen'

// Lo que dibuja una pestaña de un origen que la persona no abre: un enlace viejo nunca parece roto. Sin la pestaña, «No puedes abrir esta
// pestaña», su motivo y la primera que sí abre; sin el origen, «No puedes abrir este origen» y la lista de orígenes, si abre alguno.
export function NoSeAbre({ abierto }: { abierto: Exclude<OrigenAbierto, { tipo: 'abierto' }> }) {
  if (abierto.tipo === 'sin-pestana') {
    return (
      <EstadoSinPermiso
        titulo="No puedes abrir esta pestaña"
        descripcion={abierto.motivo}
        accion={
          <Link
            href={abierto.primera.ruta as Route}
            className={buttonVariants({ variant: 'outline' })}
          >
            {`Ir a ${abierto.primera.titulo}`}
          </Link>
        }
      />
    )
  }
  return (
    <EstadoSinPermiso
      titulo="No puedes abrir este origen"
      descripcion="Lo configura quien tiene un permiso de orígenes, de su flujo o de su fórmula en él."
      accion={
        abierto.puedeVerOtros ? (
          <Link href={RUTAS.origenes as Route} className={buttonVariants({ variant: 'outline' })}>
            Ver los orígenes
          </Link>
        ) : undefined
      }
    />
  )
}
