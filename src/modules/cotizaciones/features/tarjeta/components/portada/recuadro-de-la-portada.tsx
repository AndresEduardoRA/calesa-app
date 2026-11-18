'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'

type Props = {
  total: { valor: number; moneda?: string | null } | null
  // Falló la imagen (o no hay red): se dice y se ofrece pedirla de nuevo.
  fallo: boolean
  alReintentar: () => void
}

// Lo que ocupa el lugar de la portada mientras se arma o carga, o si falla: el total (con `<Monto>`, que respeta el Modo Live) y el estado. Va en el flujo del marco:
// con el texto al 200 % lo hace crecer en vez de salirse.
export function RecuadroDeLaPortada({ total, fallo, alReintentar }: Props) {
  return (
    <div className="relative z-10 grid content-center justify-items-center gap-2 bg-(--color-paper-dim) p-4 text-center [overflow-wrap:anywhere]">
      {total === null ? null : (
        <p className="text-(length:--text-lg) font-medium">
          <Monto
            valor={total.valor}
            {...(total.moneda === undefined ? {} : { moneda: total.moneda })}
          />
        </p>
      )}
      {fallo ? (
        <>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No se pudo cargar la vista previa.
          </p>
          <Button type="button" variant="outline" className="h-11 md:h-8" onClick={alReintentar}>
            Reintentar
          </Button>
        </>
      ) : (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Preparando la vista previa…
        </p>
      )}
    </div>
  )
}
