'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import { conteoCorto } from '@/shared/lib/conteo'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { Button } from '@/shared/ui/button'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { FILTRO_SUBASTA } from '../../../entities/filtros-de-subasta'
import { soloSinResolver, soloSinResolverComoFiltro } from '../../../entities/situacion'

type Props = {
  esquema: EsquemaDeFiltros
  // Cuántas hay en el origen, hasta el tope («99+»): nunca el total exacto.
  conteo: ConteoAcotado | null
}

// El acceso directo a lo que espera una decisión: las subastas que cerraron y nadie dijo si las ganamos. Un toque pone «Subasta: Sin resolver» (y deja el resto de
// los filtros); otro lo quita. Sin ninguna pendiente y sin el filtro puesto, no se dibuja: no hay nada que atender.
export function AtajoSinResolver({ esquema, conteo }: Props) {
  const filtros = useFiltrosDelListado()
  const def = esquema.filtros.find((filtro) => filtro.clave === FILTRO_SUBASTA)
  const puesto = soloSinResolver(filtros.valores.porClave[FILTRO_SUBASTA])
  if (!def || !conteo || (conteo.n === 0 && !puesto)) {
    return null
  }
  return (
    <div className="flex">
      <Button
        variant={puesto ? 'default' : 'outline'}
        size="sm"
        aria-pressed={puesto}
        className="h-11 md:h-8"
        onClick={() => filtros.cambiar(def, puesto ? null : soloSinResolverComoFiltro())}
      >
        Sin resolver
        <span className="tabular-nums" data-testid="conteo-sin-resolver">
          {conteoCorto(conteo)}
        </span>
      </Button>
    </div>
  )
}
