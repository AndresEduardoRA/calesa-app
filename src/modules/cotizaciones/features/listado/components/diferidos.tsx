'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El resumen entero llega recién al abrirse: el listado no carga su drawer ni su lectura para mostrar sus filas. Sin red, el aviso va en una barra fija (un panel no tiene lugar
// propio hasta que abre).
export const ResumenDeCotizacionDiferido = diferido(() =>
  import('./resumen-de-cotizacion').then((modulo) => modulo.ResumenDeCotizacion),
)

// Las vistas guardadas traen el campo y las actions de `equipo`: ≈ 70 KB en frío que `/cotizaciones` no paga para dibujarse (`e2e/soporte/presupuestos.ts`). Llegan al abrir
// «Vista y opciones»; mientras, dos líneas en su lugar. Sin red, el aviso va en el lugar de la sección, con «Reintentar».
export const VistasDeCotizacionesDiferido = diferido(
  () => import('./vistas-de-cotizaciones').then((modulo) => modulo.VistasDeCotizaciones),
  {
    esqueleto: (
      <div className="grid w-full gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    ),
    aviso: 'aqui',
  },
)
