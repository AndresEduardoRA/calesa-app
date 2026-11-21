import { CalculatorIcon } from 'lucide-react'
import Link from 'next/link'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

// Tarjeta y Publicar abiertos antes de que el origen tenga fórmula: lo que falta y el camino al paso Fórmula.
export function SinFormula({ origenId }: { origenId: string }) {
  return (
    <EstadoVacio
      Icono={CalculatorIcon}
      titulo="Este origen todavía no tiene fórmula."
      descripcion="Primero crea su fórmula: la tarjeta nace con ella."
      accion={
        <Link
          href={rutaDeLaPuestaEnMarcha(origenId, 'formula')}
          className={buttonVariants({ variant: 'outline' })}
        >
          Ir a la fórmula
        </Link>
      }
    />
  )
}
