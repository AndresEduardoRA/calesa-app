import { Suspense } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'
import { CabezaDeLaFormula } from './cabeza-de-la-formula'

// La pestaña Fórmula de un origen: sus sub-pestañas (Fórmula · Hoja · Tarjeta, cada una su ruta) con «Empezar desde una plantilla», que leen
// la sesión tras su `<Suspense>`, y debajo la sub-pestaña abierta con su `loading.tsx`. No protege: cada sub-pestaña comprueba sola.
export default function LayoutDeLaFormula({
  children,
  params,
}: LayoutProps<'/configuracion/origenes/[id]/formula'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense fallback={<Skeleton className="h-9 w-64 max-w-full" />}>
        {params.then(({ id }) => (
          <CabezaDeLaFormula id={id} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}
