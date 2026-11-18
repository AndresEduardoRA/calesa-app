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
import type { RutasDelMenuDeLead } from '../../../entities/ruta-por-lead'
import { DialogoDeExportarDiferido } from '../../exportar/components/diferidos'
import { usePanelDeExportar } from '../../exportar/hooks/use-panel-de-exportar'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { EdicionDesdeLaLista } from '../../ficha/components/edicion-desde-la-lista'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useEdicionDesdeLaLista } from '../../ficha/hooks/use-edicion-desde-la-lista'
import { useAccionDeFila } from '../hooks/use-accion-de-fila'
import { AccionesDeFila } from './acciones-de-fila'
import { AvisoDeFiltrosDescartados } from './aviso-de-filtros-descartados'
import { AvisoDePrivados } from './aviso-de-privados'
import { AvisoDeTachadosOcultos } from './aviso-de-tachados-ocultos'
import { PieDeFiltros } from './pie-de-filtros'
import { ResultadoDelListado } from './resultado-del-listado'
import { opcionesDelListado } from './opciones-del-listado'
import type { DatosDeLaLista, ParaMarcar } from './tipos'
import type { DatosDeUltimoContacto } from './ultimo-contacto'
import { ProveedorDeMarcasDeVisto } from '@/modules/equipo/client'

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
  puedeEditarTelefonos: boolean
  puedeConfigurarLeads: boolean
  // «Cotizar lead» y «Ver actividad» del «⋯»: sus rutas con `MARCADOR_DE_LEAD`, armadas una vez por página en `src/app`; nulas sin permiso.
  rutas: RutasDelMenuDeLead
  // Los tipos de seguimiento y el instante de la página: dicen el último seguimiento y el recordatorio de cada fila.
  tiposDeSeguimiento: DatosDeUltimoContacto['tipos']
  ahora: string
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

// El «⋯» de las filas, armado una vez para la página: lo que cada una necesita (`ParaMarcar`: anotar, agendar y la oportunidad con
// `leads.editar`; las rutas de «Cotizar lead» y «Ver actividad»; editar el lead) y la URL del panel de edición (`?panel=editar-lead&para=`).
function useMenuDeLasFilas(
  p: Pick<Props, 'eliminables' | 'puedeAnotar' | 'puedeEditarTelefonos' | 'rutas'>,
  etiquetas: ParaMarcar['etiquetas'],
  alGestionar: () => void,
) {
  const accionDeFila = useAccionDeFila()
  const edicion = useEdicionDesdeLaLista()
  const marcar: ParaMarcar = {
    etiquetas,
    alGestionar,
    eliminables: p.eliminables,
    alAccion: p.puedeAnotar ? accionDeFila.abrir : null,
    ...p.rutas,
    edicion: { editar: p.puedeAnotar, telefonos: p.puedeEditarTelefonos, abrir: edicion.abrir },
  }
  return { marcar, edicion }
}

// Lo que abren los «⋯» de las filas, montado una vez: anotar, agendar o crear una oportunidad, y editar el lead.
function PanelesDeLasFilas(
  p: Pick<Props, 'pagina' | 'puedeAnotar' | 'puedeEditarTelefonos' | 'puedeConfigurarLeads'> & {
    edicion: ReturnType<typeof useEdicionDesdeLaLista>
  },
) {
  return (
    <>
      <AccionesDeFilaConRelectura filas={p.pagina.filas} puedeAnotar={p.puedeAnotar} />
      <EdicionDesdeLaLista
        edicion={p.edicion}
        permisos={{
          editar: p.puedeAnotar,
          telefonos: p.puedeEditarTelefonos,
          configurar: p.puedeConfigurarLeads,
        }}
      />
    </>
  )
}

// La lista con las marcas de «visto» de su página (una lectura). Ninguno se abre acá: lo registra la ficha (`RegistrarVisto`).
function ResultadoConVistos(props: ComponentProps<typeof ResultadoDelListado>) {
  return (
    <ProveedorDeMarcasDeVisto
      modulo="leads"
      tipo="lead"
      ids={props.pagina.filas.map((fila) => fila.id)}
      abierto={null}
    >
      <ResultadoDelListado {...props} />
    </ProveedorDeMarcasDeVisto>
  )
}

// Los leads: filtros del layout en la URL, vistas guardadas y la lista (tabla o tarjetas), cuyas filas llevan a la ficha. Todo el estado
// (filtros, alcance, página) vive en la URL.
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
    eliminables: _eliminables,
    puedeAbrirPapelera: _puedeAbrirPapelera,
    puedeAnotar: _puedeAnotar,
    puedeEditarTelefonos: _puedeEditarTelefonos,
    puedeConfigurarLeads: _puedeConfigurarLeads,
    rutas: _rutas,
    tiposDeSeguimiento,
    ahora,
    ...delServidor
  } = props
  const [panel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const etiquetas = useEtiquetas(delServidor.etiquetas)
  const gestionar = usePanelDeEtiquetas()
  // El diálogo de exportar vive acá y no en la opción: así `?panel=exportar` lo abre con «Vista y opciones» cerrado (una sola llamada a
  // `usePanelDeExportar`: `useVueltaDelFoco` no admite dos).
  const exportar = usePanelDeExportar()
  const exportarMontado = useAbiertoAlgunaVez(exportar.abierto) && puedeExportar
  // La lista local: una etiqueta recién creada nombra la fila antes de que vuelva el servidor.
  const datos = { ...delServidor, etiquetas: etiquetas.lista }
  const { marcar, edicion } = useMenuDeLasFilas(props, etiquetas, gestionar.abrir)
  const ultimoContacto = { tipos: tiposDeSeguimiento, ahora }
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
            marcar={marcar}
            ocultos={ocultos}
            recorrido={recorrido}
            ultimoContacto={ultimoContacto}
          />
        </div>
      </FilterShell>
      <DialogoDeEtiquetas etiquetas={etiquetas} />
      {exportarMontado ? (
        <DialogoDeExportarDiferido abierto={exportar.abierto} alCerrar={exportar.cerrar} />
      ) : null}
      <PanelesDeLasFilas {...props} edicion={edicion} />
      {/* Lo de otra pestaña aparece al volver; con un panel abierto, no (relee la página). */}
      <RefrescarAlVolver activo={panel === null} />
    </div>
  )
}
