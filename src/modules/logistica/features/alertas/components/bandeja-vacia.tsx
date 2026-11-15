import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

// Nada pendiente hoy: todos los grupos que ve quien mira están vacíos. Con el camino a la cadena, que está más abajo en la misma pantalla.
export function BandejaVacia() {
  return (
    <EstadoVacio
      compacto
      titulo="Nada pendiente hoy"
      descripcion="No hay vehículos demorados ni documentos esperando."
      accion={
        <Link
          href={'#cadena' as Route}
          className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
        >
          Ver la cadena
        </Link>
      }
    />
  )
}
