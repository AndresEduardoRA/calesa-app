'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { CLAVE_DE_CURSOR, cumpleElMinimo } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina, type Pagina } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { MINIMO_DE_BUSQUEDA_DE_COTIZACIONES } from '../../../entities/listado/filtros-del-listado'
import { TOPE_DE_COINCIDENCIAS } from '../../../entities/listado/listado'
import { EnlaceVerTodas } from './aviso-de-lo-filtrado'
import { TablaDeCotizaciones } from './tabla-de-cotizaciones'
import { TarjetasDeCotizaciones } from './tarjetas-de-cotizaciones'
import type { FilaDeCotizacion, MenuDeFila, OrigenDelListado } from './tipos'

type Props = {
  pagina: Pagina<FilaDeCotizacion>
  origenes: readonly OrigenDelListado[]
  // «Nueva cotización», si la persona puede cotizar en algún origen: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
  // Con `?vehiculo=` o `?lead=`: el vacío sin otros filtros habla de ese vehículo o cliente (`textoDelVacio()`); sin ellos, null.
  vacioDeLoFiltrado: string | null
  // Abre el resumen de una cotización y cuál está abierta (`?cotizacion=`).
  alAbrir: (id: string) => void
  abierta: string | null
  // El «⋯» de cada fila y de cada tarjeta (T15).
  menuDeFila?: MenuDeFila | undefined
  // Con una búsqueda, alguna fuente (clientes, vehículos o personas) tenía más coincidencias que el tope: se avisa al pie de la lista.
  acotada: boolean
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

// La lista o el estado que corresponda: vacío de primera vez, vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista (`<UnaSolaVista>`): la tabla
// desde `md` y las tarjetas por debajo. Sin total ni «Página N de M»: sólo dónde estás y Anterior o Siguiente.
export function ResultadoDelListado({
  pagina,
  origenes,
  accionDeVacio,
  vacioDeLoFiltrado,
  alAbrir,
  abierta,
  menuDeFila,
  acotada,
}: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)

  if (pagina.filas.length === 0) {
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

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacionDeLaPagina(pagina)} />
      <UnaSolaVista
        tabla={() => (
          <TablaDeCotizaciones
            cotizaciones={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
          />
        )}
        tarjetas={() => (
          <TarjetasDeCotizaciones
            cotizaciones={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
          />
        )}
      />
      {acotada ? (
        <AvisoDeTope
          texto={`La búsqueda nombra a lo sumo ${String(TOPE_DE_COINCIDENCIAS)} clientes, vehículos o personas, los más recientes.`}
          camino="Escribe más para afinarla."
        />
      ) : null}
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
