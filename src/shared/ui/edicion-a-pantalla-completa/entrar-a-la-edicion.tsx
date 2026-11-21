import type { Route } from 'next'
import Link from 'next/link'
import { PencilIcon } from 'lucide-react'
import { cn } from 'cn'
import { buttonVariants } from '../button'

// «Editar»: entra a la edición a pantalla completa de la pieza (la misma ruta con `?editar=si`). Una sola, la acción principal de la pieza.
export function EntrarALaEdicion({
  href,
  nombre,
  className,
}: {
  href: Route
  // Qué se edita, para el lector de pantalla («Editar la planilla»).
  nombre: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={`Editar ${nombre}`}
      className={cn(buttonVariants({ className: 'min-h-11 md:min-h-8' }), className)}
    >
      <PencilIcon aria-hidden data-icon="inline-start" />
      Editar
    </Link>
  )
}
