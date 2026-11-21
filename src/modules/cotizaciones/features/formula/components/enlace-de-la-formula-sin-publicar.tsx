import Link from 'next/link'
import { rutaDeLasFormulas } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El enlace de «Falta publicar la fórmula de <origen>» a la Fórmula del origen: el núcleo (`<FormulaSinPublicar>`) lo recibe como `accion` y la página lo une
// (`pantallas/formula-hoja.ts`). Lleva a la pestaña «Fórmulas» de ese origen, que dice cuál es la activa y si tiene una versión publicada.
export function EnlaceDeLaFormulaSinPublicar({ origenId }: { origenId: string }) {
  return (
    <Link
      href={rutaDeLasFormulas(origenId)}
      className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
    >
      Ir a la configuración de cotización
    </Link>
  )
}
