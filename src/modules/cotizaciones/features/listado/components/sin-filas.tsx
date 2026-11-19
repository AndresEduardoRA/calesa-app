'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CLAVE_DE_CURSOR, cumpleElMinimo } from '@/shared/lib/filtros'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { MINIMO_DE_BUSQUEDA_DE_COTIZACIONES } from '../../../entities/listado/filtros-del-listado'
import { EnlaceVerTodas } from './aviso-de-lo-filtrado'

type Props = {
  // «Nueva cotización», si la persona puede cotizar en algún origen: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
  // Con `?vehiculo=` o `?lead=`: el vacío sin otros filtros habla de ese vehículo o cliente (`textoDelVacio()`); sin ellos, null.
  vacioDeLoFiltrado: string | null
}

// Nada coincide. Con una búsqueda puesta (que alcanza el mínimo), «Limpiar búsqueda» la quita y deja los filtros (los chips los quitan); sin ella, «Limpiar filtros».
function SinResultados() {
  const filtros = useFiltrosDelListado()
  const texto = filtros.valores.busqueda.trim()
  if (!cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DE_COTIZACIONES)) {
    return <EstadoSinResultados alLimpiar={filtros.limpiar} />
  }
  return (
    <EstadoSinResultados
      alLimpiar={() => {
        filtros.buscar('')
      }}
      etiquetaDeLimpiar="Limpiar búsqueda"
      descripcion={`Ninguna cotización coincide con «${texto}». Busca por número, título, cliente, vehículo o autor.`}
    />
  )
}

// La lista sin nada que dibujar, en tabla, tarjetas o agrupada: vacío por filtro (con «Limpiar»), una página que se quedó sin filas, el de un vehículo o un cliente,
// o el de primera vez.
export function SinFilas({ accionDeVacio, vacioDeLoFiltrado }: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  if (filtros.hayFiltros) {
    return <SinResultados />
  }
  if (hayCursor) {
    return <EstadoPaginaSinFilas />
  }
  if (vacioDeLoFiltrado !== null) {
    return <EstadoVacio titulo={vacioDeLoFiltrado} accion={<EnlaceVerTodas />} />
  }
  return (
    <EstadoVacio
      titulo="Todavía no hay cotizaciones que puedas ver."
      descripcion="Las que se guarden desde la hoja de cotizar van a aparecer acá."
      accion={accionDeVacio}
    />
  )
}
