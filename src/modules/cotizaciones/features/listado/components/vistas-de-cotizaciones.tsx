'use client'

import { VistasGuardadas, type VistaGuardada } from '@/modules/equipo/client'
import { parametrosDeFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import { CLAVE_DE_VISTA, type VistaDeLista } from '@/shared/lib/vista-de-lista'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { CLAVE_DE_AGRUPAR } from '../../../entities/listado/grupos-del-listado'

type Props = {
  esquema: EsquemaDeFiltros
  vistas: readonly VistaGuardada[]
  // Cómo se ve ahora: una vista guardada lo recuerda también (tabla o tarjetas y si va agrupada).
  vista: VistaDeLista
  agrupar: boolean
}

// Las vistas guardadas de las cotizaciones: la búsqueda y los filtros de ahora (`?q=`, `?origen=`, `?clase=`, `?cuales=`), la vista (`?vista=`) y la agrupación
// (`?agrupar=`). `?vehiculo=` y `?lead=` no son del esquema: una vista no los guarda. Una vista con un origen que quien mira ya no ve, o un filtro que ya no existe, se
// aplica sin él (la lectura de la URL lo descarta); una vieja, sin vista ni agrupación, deja las de la persona.
export function VistasDeCotizaciones({ esquema, vistas, vista, agrupar }: Props) {
  const filtros = useFiltrosDelListado()
  return (
    <VistasGuardadas
      pantalla="cotizaciones"
      vistas={vistas}
      actuales={{
        ...parametrosDeFiltros(esquema, filtros.valores),
        [CLAVE_DE_VISTA]: vista,
        [CLAVE_DE_AGRUPAR]: agrupar ? 'si' : 'no',
      }}
      puedeGuardar={filtros.hayFiltros}
    />
  )
}
