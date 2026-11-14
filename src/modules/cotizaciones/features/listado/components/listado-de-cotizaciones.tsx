'use client'

import type { ReactNode } from 'react'
import type { VistaGuardada } from '@/modules/equipo/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { FilterShell } from '@/shared/ui/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { textoDelAviso, textoDelVacio } from '../../../entities/listado/aviso-del-listado'
import type { LecturaDelServidor } from '../../../entities/listado/resumen-del-listado'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { AvisoDeLoFiltrado } from './aviso-de-lo-filtrado'
import { ResumenDeCotizacionDiferido } from './diferidos'
import { NuevaCotizacion } from './nueva-cotizacion'
import { ResultadoDelListado } from './resultado-del-listado'
import type { FilaDeCotizacion, MenuDeFila, OrigenDelListado } from './tipos'
import { VistasDeCotizaciones } from './vistas-de-cotizaciones'

type Props = {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeCotizacion>
  // Con una búsqueda, alguna fuente tenía más coincidencias que el tope (`PaginaDelListado.acotada`).
  acotada: boolean
  // Las vistas guardadas de quien mira (T15), como en `/leads` y `/vehiculos`.
  vistas: readonly VistaGuardada[]
  // El «⋯» de cada fila y de cada tarjeta, y los diálogos que abre (uno por pantalla): los une `src/app`, que junta lo de cada área. Sin ellos, la lista no tiene acciones.
  menuDeFila?: MenuDeFila
  dialogos?: ReactNode
  // «Ítems por página»: lo que dibuja esta página y hasta cuánto ofrece el selector.
  porPagina: { valor: number; opciones: readonly number[] }
  origenes: readonly OrigenDelListado[]
  // La ruta de «Nueva cotización», o null si quien mira no cotiza en ningún origen (sin el botón).
  rutaDeNueva: string | null
  // Con `?vehiculo=`: el título del vehículo (null si quien mira no lo ve). Sin él, `undefined`.
  vehiculo?: { titulo: string | null }
  // Con `?lead=`: el nombre del cliente (null si quien mira no tiene `leads.ver` o no ve al lead). Sin él, `undefined`. Pueden llegar los dos.
  lead?: { nombre: string | null }
  // Lo que el servidor leyó de la cotización de `?cotizacion=` cuando no está en la página (null si no hay clave, no es un guid o está en la página).
  delServidor: LecturaDelServidor | null
  // Lo que un área suma junto a «Nueva cotización» (4.15-6b, la papelera del 4.24): ya dibujado por la página y antes de «Nueva». Sin él, la barra queda como siempre.
  junto?: ReactNode
}

// El listado de cotizaciones: búsqueda, filtros, vistas guardadas, «Nueva cotización» y la lista con su «⋯». Todo el estado (filtros, página) vive en la URL.
export function ListadoDeCotizaciones({
  esquema,
  pagina,
  acotada,
  vistas,
  menuDeFila,
  dialogos,
  porPagina,
  origenes,
  rutaDeNueva,
  vehiculo,
  lead,
  delServidor,
  junto,
}: Props) {
  const resumen = useResumenDeCotizacion()
  // El resumen llega recién al abrirse (`diferido()`) y, una vez visto, queda montado para irse con su animación.
  const resumenMontado = useAbiertoAlgunaVez(resumen.texto !== null)
  const nueva = rutaDeNueva === null ? undefined : <NuevaCotizacion ruta={rutaDeNueva} />
  // El vacío ofrece sólo «Nueva»: lo de `junto` es de la barra.
  const acciones =
    junto === undefined ? (
      nueva
    ) : (
      <>
        {junto}
        {nueva}
      </>
    )
  const aviso = textoDelAviso({ lead, vehiculo })
  return (
    <div className="grid gap-4">
      {/* El título de la página para quien lee en voz alta: la barra de filtros ocupa la cabecera (como en `/leads`). */}
      <h1 className="sr-only">Cotizaciones</h1>
      <FilterShell
        esquema={esquema}
        porPagina={porPagina}
        acciones={acciones}
        vistas={<VistasDeCotizaciones esquema={esquema} vistas={vistas} />}
      >
        {aviso === null ? null : <AvisoDeLoFiltrado texto={aviso} />}
        <ResultadoDelListado
          pagina={pagina}
          origenes={origenes}
          accionDeVacio={nueva}
          vacioDeLoFiltrado={textoDelVacio({
            lead: lead !== undefined,
            vehiculo: vehiculo !== undefined,
          })}
          alAbrir={resumen.abrir}
          abierta={resumen.id}
          menuDeFila={menuDeFila}
          acotada={acotada}
        />
      </FilterShell>
      {dialogos}
      {resumenMontado ? (
        <ResumenDeCotizacionDiferido
          filas={pagina.filas}
          origenes={origenes}
          delServidor={delServidor}
        />
      ) : null}
    </div>
  )
}
