import { Suspense } from 'react'
import { CabeceraDeLaPuestaEnMarcha, EsqueletoDeLaCabecera } from './cabecera'

// La puesta en marcha de un origen (glosario): fuera del grupo `(pestanas)`, sin la tira ni las pestañas de su página. Arriba la cabecera (lee la sesión y
// el origen tras su `<Suspense>`); debajo, cada paso con su paso a paso y su propio `loading.tsx`. El layout no protege: cada paso comprueba solo.
export default function LayoutDeLaPuestaEnMarcha({
  children,
  params,
}: LayoutProps<'/configuracion/origenes/[id]/puesta-en-marcha'>) {
  return (
    <div className="grid min-w-0 gap-6">
      <Suspense fallback={<EsqueletoDeLaCabecera />}>
        {params.then(({ id }) => (
          <CabeceraDeLaPuestaEnMarcha id={id} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}
