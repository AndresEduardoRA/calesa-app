'use client'

import { BookmarkIcon } from 'lucide-react'
import { buttonVariants } from '@/shared/ui/button'
import { diferido } from '@/shared/ui/diferido'

// El resumen entero llega recién al abrirse: el listado no carga su drawer ni su lectura para mostrar sus filas. Sin red, el aviso va en una barra fija (un panel no tiene lugar
// propio hasta que abre).
export const ResumenDeCotizacionDiferido = diferido(() =>
  import('./resumen-de-cotizacion').then((modulo) => modulo.ResumenDeCotizacion),
)

// Las vistas guardadas traen el popover, el campo y las actions de `equipo`: ≈ 70 KB en frío que `/cotizaciones` no paga para dibujarse (`e2e/soporte/presupuestos.ts`). Llegan tras
// hidratar; mientras, el botón «Vistas» está en su lugar y apagado (no hay layout que se corra). Sin red, el aviso va en el lugar del botón, con «Reintentar».
export const VistasDeCotizacionesDiferido = diferido(
  () => import('./vistas-de-cotizaciones').then((modulo) => modulo.VistasDeCotizaciones),
  {
    esqueleto: (
      <button
        type="button"
        disabled
        className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
      >
        <BookmarkIcon aria-hidden />
        Vistas
      </button>
    ),
    aviso: 'aqui',
  },
)
