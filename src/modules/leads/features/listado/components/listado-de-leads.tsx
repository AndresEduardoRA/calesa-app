'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import type { ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { CLAVE_DE_PANEL, camposFiltrables, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { FilterShell, useFiltrosDelListado } from '@/shared/ui/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ModoDelListado } from '../../../entities/alcance'
import type { CampoDeLead } from '../../../entities/campo'
import { privadosFiltrando } from '../../../entities/filtros'
import type { FiltroDescartado } from '../../../entities/filtros-descartados'
import { SECCION_MARCAS } from '../../../entities/filtros-de-marcas'
import type { FilaDeLead } from '../../../entities/listado'
import type { RecorridoAcotado } from '../../../entities/candidatos'
import { DialogoDeExportarDiferido } from '../../exportar/components/diferidos'
import { usePanelDeExportar } from '../../exportar/hooks/use-panel-de-exportar'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { DrawerDeLead } from '../../rapido/components/drawer-de-lead'
import { useDrawerDeLead } from '../../rapido/hooks/use-drawer-de-lead'
import { useAccionDeFila } from '../hooks/use-accion-de-fila'
import { AccionesDeFila } from './acciones-de-fila'
import { AvisoDeFiltrosDescartados } from './aviso-de-filtros-descartados'
import { AvisoDePrivados } from './aviso-de-privados'
import { AvisoDeTachadosOcultos } from './aviso-de-tachados-ocultos'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import { opcionesDelListado } from './opciones-del-listado'
import type { DatosDeLaLista } from './tipos'
import type { DatosDeUltimoContacto } from './ultimo-contacto'
import { ProveedorDeMarcasDeVisto } from '@/modules/equipo/client'
import type { HuecosDelRapido } from '../../rapido/huecos'

type Props = DatosDeLaLista & {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeLead>
  porPagina: { valor: number; opciones: readonly number[] }
  vistas: readonly VistaGuardada[]
  modo: ModoDelListado
  puedeVerTodos: boolean
  puedeCrear: boolean
  puedeExportar: boolean
  puedeConfigurarCampos: boolean
  descartados: readonly FiltroDescartado[]
  ocultos: ConteoAcotado
  recorrido: RecorridoAcotado | null
  eliminables: readonly string[]
  puedeAbrirPapelera: boolean
  puedeAnotar: boolean
  // Los tipos de seguimiento y el instante de la página: dicen el último seguimiento y el recordatorio de cada fila.
  tiposDeSeguimiento: DatosDeUltimoContacto['tipos']
  ahora: string
  puedeEditarExtras: boolean
  puedeConfigurar: boolean
  // Lo que `src/app` llena en el resumen del drawer (el bloque «Relacionados»: `leads` no importa `vehiculos`).
  huecosDelResumen?: HuecosDelRapido
}

// Lo que va arriba de la lista: lo que la URL traía y ya no vale, y la aclaración de un filtro
// privado en «todos».
function AvisosDelListado({
  campos,
  modo,
  descartados,
  ocultos,
  hayFilas,
}: Pick<Props, 'campos' | 'modo' | 'descartados' | 'ocultos'> & { hayFilas: boolean }) {
  const filtros = useFiltrosDelListado()
  const privados = modo === 'todos' ? privadosFiltrando(campos, filtros.valores) : []
  return (
    <>
      <AvisoDeFiltrosDescartados descartados={descartados} />
      <AvisoDePrivados etiquetas={privados} />
      {/* Sin filas lo dice el estado vacío, con el mismo «Mostrarlos». */}
      {hayFilas ? <AvisoDeTachadosOcultos ocultos={ocultos} /> : null}
    </>
  )
}

// El enlace de la sección «Tus marcas» del panel de filtros.
function GestionarEtiquetas({ alAbrir }: { alAbrir: () => void }) {
  return (
    <Button type="button" variant="link" className="h-11 w-fit px-0 md:h-auto" onClick={alAbrir}>
      Gestionar etiquetas
    </Button>
  )
}

// Al pie del panel de filtros: cuántos campos se pueden filtrar y el camino a configurarlos.
function PieDelPanel(props: { campos: readonly CampoDeLead[]; puedeConfigurar: boolean }) {
  return (
    <PieDeFiltros
      filtrables={camposFiltrables(props.campos).length}
      puedeConfigurar={props.puedeConfigurar}
    />
  )
}

// Anotar o agendar desde el «⋯»: al guardar, la página se relee y la fila muestra el seguimiento o el recordatorio nuevo (la URL no cambia).
function AccionesDeFilaConRelectura(props: { filas: readonly FilaDeLead[]; puedeAnotar: boolean }) {
  const router = useRouter()
  return (
    <AccionesDeFila
      {...props}
      alGuardar={() => {
        router.refresh()
      }}
    />
  )
}

// La lista con las marcas de «visto» de su página (una lectura) y el abierto marcado al abrirse.
function ResultadoConVistos(props: ComponentProps<typeof ResultadoDelListado>) {
  return (
    <ProveedorDeMarcasDeVisto
      modulo="leads"
      tipo="lead"
      ids={props.pagina.filas.map((fila) => fila.id)}
      abierto={props.abierto}
    >
      <ResultadoDelListado {...props} />
    </ProveedorDeMarcasDeVisto>
  )
}

// Los leads: filtros del layout en la URL, vistas guardadas, la lista (tabla o tarjetas) y el
// drawer rápido. Todo el estado (filtros, alcance, página, lead abierto) vive en la URL.
export function ListadoDeLeads(props: Props) {
  const {
    esquema,
    pagina,
    porPagina,
    // Van a «Vista y opciones» con `props`; acá sólo se apartan de lo que viaja al resto.
    vistas: _vistas,
    modo,
    puedeVerTodos,
    puedeCrear,
    puedeExportar,
    puedeConfigurarCampos,
    descartados,
    ocultos,
    recorrido,
    eliminables,
    puedeAbrirPapelera: _puedeAbrirPapelera,
    puedeAnotar,
    tiposDeSeguimiento,
    ahora,
    ...delServidor
  } = props
  const drawer = useDrawerDeLead()
  const accionDeFila = useAccionDeFila()
  const [panel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const etiquetas = useEtiquetas(delServidor.etiquetas)
  const gestionar = usePanelDeEtiquetas()
  // El diálogo de exportar vive acá y no en la opción: así `?panel=exportar` lo abre con «Vista y opciones» cerrado (una sola llamada a
  // `usePanelDeExportar`: `useVueltaDelFoco` no admite dos).
  const exportar = usePanelDeExportar()
  const exportarMontado = useAbiertoAlgunaVez(exportar.abierto) && puedeExportar
  // La lista local: una etiqueta recién creada nombra la fila antes de que vuelva el servidor.
  const datos = { ...delServidor, etiquetas: etiquetas.lista }
  const alAccion = puedeAnotar ? accionDeFila.abrir : null
  const marcar = { etiquetas, alGestionar: gestionar.abrir, eliminables, alAccion }
  // `puedeEditarExtras` y `puedeConfigurar` viajan con `datos` hasta el drawer.
  const delDrawer = { filas: pagina.filas, soloMios: !puedeVerTodos, puedeEditar: puedeAnotar }
  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Leads</h1>
      <FilterShell
        esquema={esquema}
        porPagina={porPagina}
        opciones={opcionesDelListado({ ...props, alExportar: exportar.abrir })}
        accionesDeSeccion={{ [SECCION_MARCAS]: <GestionarEtiquetas alAbrir={gestionar.abrir} /> }}
        pieDelPanel={<PieDelPanel campos={datos.campos} puedeConfigurar={puedeConfigurarCampos} />}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <AvisosDelListado
            campos={datos.campos}
            modo={modo}
            descartados={descartados}
            ocultos={ocultos}
            hayFilas={pagina.filas.length > 0}
          />
          <ResultadoConVistos
            {...datos}
            pagina={pagina}
            modo={modo}
            puedeVerTodos={puedeVerTodos}
            puedeCrear={puedeCrear}
            alAbrir={drawer.abrir}
            abierto={drawer.id}
            marcar={marcar}
            ocultos={ocultos}
            recorrido={recorrido}
            ultimoContacto={{ tipos: tiposDeSeguimiento, ahora }}
          />
        </div>
      </FilterShell>
      <DrawerDeLead {...datos} {...delDrawer} marcar={marcar} />
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      {exportarMontado ? (
        <DialogoDeExportarDiferido abierto={exportar.abierto} alCerrar={exportar.cerrar} />
      ) : null}
      <AccionesDeFilaConRelectura filas={pagina.filas} puedeAnotar={puedeAnotar} />
      {/* Lo de otra pestaña aparece al volver; con un panel abierto, no (relee la página). */}
      <RefrescarAlVolver activo={panel === null} />
    </div>
  )
}
