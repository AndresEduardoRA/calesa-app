import { LockIcon } from 'lucide-react'
import { badgeVariants } from '@/shared/ui/badge'
import { ETIQUETA_DE_PRIVADA } from '../../../entities/privada'

// La insignia «Privada» (glosario: «Cotización privada») de la tabla, la tarjeta, el resumen, la línea de un grupo y la guardada: un `<span>` con las clases de `<Badge>`
// (sin el primitivo de Base UI: el JS en frío de `/cotizaciones/[id]` está al tope) y el candado, que no se lee (el texto ya lo dice). Puro: lo dibujan el servidor y el
// navegador.
export function InsigniaPrivada() {
  return (
    <span className={badgeVariants({ variant: 'secondary' })} data-privada="">
      <LockIcon className="size-3" aria-hidden />
      {ETIQUETA_DE_PRIVADA}
    </span>
  )
}
