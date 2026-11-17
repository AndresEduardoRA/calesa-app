'use client'

import { VistasGuardadas, type VistaGuardada } from '@/modules/equipo/client'
import { parametrosDeFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useFiltrosDelListado } from '@/shared/ui/filtros'

type Props = {
  esquema: EsquemaDeFiltros
  vistas: readonly VistaGuardada[]
}

// Las vistas guardadas de las cotizaciones: la búsqueda y los filtros de ahora (`?q=`, `?origen=`, `?clase=`, `?cuales=`). `?vehiculo=` y `?lead=` no son del esquema: una vista no los
// guarda. Una vista con un origen que quien mira ya no ve, o un filtro que ya no existe, se aplica sin él (la lectura de la URL lo descarta).
export function VistasDeCotizaciones({ esquema, vistas }: Props) {
  const filtros = useFiltrosDelListado()
  return (
    <VistasGuardadas
      pantalla="cotizaciones"
      vistas={vistas}
      actuales={parametrosDeFiltros(esquema, filtros.valores)}
      puedeGuardar={filtros.hayFiltros}
    />
  )
}
