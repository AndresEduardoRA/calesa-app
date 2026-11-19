'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina } from '@/shared/lib/paginacion'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import type { PaginaAgrupada, PedidoDelGrupo } from '../../../entities/listado/grupos-del-listado'
import { TOPE_DE_COINCIDENCIAS } from '../../../entities/listado/listado'
import { DespliegueDelGrupoDiferido } from './grupo'
import { SinFilas } from './sin-filas'
import { TablaDeCotizaciones } from './tabla-de-cotizaciones'
import { TarjetasDeCotizaciones } from './tarjetas-de-cotizaciones'
import type {
  CompartirDe,
  EntradaDeLaLista,
  FilaDeCotizacion,
  HuecosDeLaLista,
  MenuDeFila,
  OrigenDelListado,
} from './tipos'

type Props = {
  pagina: PaginaAgrupada<FilaDeCotizacion>
  // La vista de escritorio (en el celular, siempre tarjetas).
  vista: VistaDeLista
  origenes: readonly OrigenDelListado[]
  accionDeVacio?: ReactNode
  vacioDeLoFiltrado: string | null
  alAbrir: (id: string) => void
  abierta: string | null
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  huecos?: HuecosDeLaLista | undefined
  rutaDeClientes: string | null
  // Los filtros de la página, para el despliegue de un grupo (las del vehículo que coinciden).
  filtrosDelGrupo: Omit<PedidoDelGrupo, 'vehiculoId' | 'cursor'>
  acotada: boolean
}

const idDelDespliegue = (ordenId: string) => `grupo-${ordenId}`

// «Seguir buscando»: la misma URL con el cursor de donde quedó la base.
function SeguirBuscando({ cursor }: { cursor: string }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.set(CLAVE_DE_CURSOR, cursor)
  return (
    <AvisoDeTope
      texto="Revisamos muchas cotizaciones sin completar la página."
      camino={
        <Link
          href={`${ruta}?${parametros.toString()}` as Route}
          className="underline hover:text-(--color-ink)"
        >
          Seguir buscando
        </Link>
      }
    />
  )
}

// Qué grupos están desplegados (por la cotización que los ordena: no son de la URL) y cómo se despliega uno.
function useGruposDesplegados({
  filtrosDelGrupo,
  huecos,
  alAbrir,
}: Pick<Props, 'filtrosDelGrupo' | 'huecos' | 'alAbrir'>) {
  const [desplegados, setDesplegados] = useState<ReadonlySet<string>>(new Set())
  const alternar = (ordenId: string) => {
    setDesplegados((antes) => {
      const despues = new Set(antes)
      if (!despues.delete(ordenId)) {
        despues.add(ordenId)
      }
      return despues
    })
  }
  // El bloque lleva el id que nombra `aria-controls` desde el primer cuadro (mientras llega su código, el esqueleto).
  const despliegue = (entrada: Extract<EntradaDeLaLista, { tipo: 'grupo' }>) => (
    <div id={idDelDespliegue(entrada.ordenId)}>
      <DespliegueDelGrupoDiferido
        cabeza={entrada.cabeza}
        pedido={{ ...filtrosDelGrupo, vehiculoId: entrada.vehiculoId }}
        ordenId={filtrosDelGrupo.texto === undefined ? entrada.ordenId : null}
        Comparar={huecos?.Comparar}
        alAbrir={alAbrir}
      />
    </div>
  )
  return { desplegados, alternar, despliegue, idDelDespliegue }
}

// La lista o el estado que corresponda (`SinFilas`). Una sola vista (`<UnaSolaVista preferida>`): la tabla sólo en escritorio y si la persona la eligió; si no, las
// tarjetas. Agrupada, cada grupo se despliega en el lugar (lo desplegado vive aquí: no es de la URL). Sin total ni «Página N de M»: dónde estás y Anterior o
// Siguiente; si la base recorrió su tope sin completar la página, «Seguir buscando».
export function ResultadoDelListado({
  pagina,
  vista,
  origenes,
  accionDeVacio,
  vacioDeLoFiltrado,
  alAbrir,
  abierta,
  menuDeFila,
  compartirDe,
  huecos,
  rutaDeClientes,
  filtrosDelGrupo,
  acotada,
}: Props) {
  const grupos = useGruposDesplegados({ filtrosDelGrupo, huecos, alAbrir })
  if (pagina.filas.length === 0) {
    return pagina.cortada === null ? (
      <SinFilas accionDeVacio={accionDeVacio} vacioDeLoFiltrado={vacioDeLoFiltrado} />
    ) : (
      <SeguirBuscando cursor={pagina.cortada} />
    )
  }
  const ubicacion = ubicacionDeLaPagina({
    ...pagina,
    filas: pagina.filas.map((entrada) => ({ id: entrada.ordenId, creadoEn: entrada.ordenEn })),
  })
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacion} />
      <UnaSolaVista
        preferida={vista}
        tabla={() => (
          <TablaDeCotizaciones
            entradas={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
            {...grupos}
          />
        )}
        tarjetas={() => (
          <TarjetasDeCotizaciones
            entradas={pagina.filas}
            origenes={origenes}
            alAbrir={alAbrir}
            abierta={abierta}
            menuDeFila={menuDeFila}
            compartirDe={compartirDe}
            huecos={huecos}
            rutaDeClientes={rutaDeClientes}
            {...grupos}
          />
        )}
      />
      {acotada ? (
        <AvisoDeTope
          texto={`La búsqueda nombra a lo sumo ${String(TOPE_DE_COINCIDENCIAS)} clientes, vehículos o personas, los más recientes.`}
          camino="Escribe más para afinarla."
        />
      ) : null}
      {pagina.cortada === null ? null : <SeguirBuscando cursor={pagina.cortada} />}
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
