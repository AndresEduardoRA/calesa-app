import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import {
  MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  esquemaDelListado,
  filasConNombres,
  idDelResumen,
  idsDe,
  leerAprobadasDeCotizaciones,
  leerAutoresDeCotizaciones,
  leerListadoDeCotizaciones,
  leerUnaDelListado,
  origenParaNueva,
  pedidoDelListado,
  rutaDeLaHoja,
  CLAVE_DE_LEAD,
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  CLAVE_DE_VEHICULO,
  type FilaDelListado,
  type LecturaDelServidor,
} from '@/modules/cotizaciones'
import { HUECOS_DE_PAPELERA_EN_EL_LISTADO } from '@/modules/cotizaciones/pantallas/papelera-listado'
import { leerVistas, requerirSesion } from '@/modules/equipo'
import { MarcasDeVistoDeLaPagina } from '@/modules/equipo/pantallas/marcas-de-visto'
import { leerNombresDeLeads } from '@/modules/leads'
import { getOrigenes } from '@/modules/origenes'
import { leerTitulosDeVehiculos, leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_POR_PAGINA, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor, leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { origenesCon, puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { ListadoConAcciones } from './listado-con-acciones'
import { menusDeLaPagina, quienesDelResumen } from './menus-de-la-pagina'

export const metadata: Metadata = { title: 'Cotizaciones' }

// Las cotizaciones que quien mira ve (`docs/UX.md` › «Cotizaciones»): una página por cursor con sus filtros en la URL. Lo que se ve lo decide la RLS (`cotizaciones_listado()` es invocadora);
// acá sólo se arma el pedido, se leen los nombres de la página y se dibuja.
export default function PaginaDeCotizaciones({ searchParams }: PageProps<'/cotizaciones'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={8} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
  )
}

// Los nombres de unas filas, una vez y por clave primaria: el cliente sólo con `leads.ver`; lo que quien mira no ve no llega y se dibuja «—».
async function nombresDe(permisos: Permisos, filas: readonly FilaDelListado[]) {
  const [clientes, vehiculos, autores, aprobadas] = await Promise.all([
    puede(permisos, 'leads.ver')
      ? leerNombresDeLeads(idsDe(filas, 'leadId'))
      : Promise.resolve({ ok: true as const, data: new Map<string, string>() }),
    leerTitulosDeVehiculos(idsDe(filas, 'vehiculoId')),
    leerAutoresDeCotizaciones(idsDe(filas, 'creadoPor')),
    // Cuáles son la aprobada de su vehículo: por el único de `cotizaciones_aprobadas`, con la RLS de quien mira.
    leerAprobadasDeCotizaciones(filas.map((fila) => fila.id)),
  ])
  return {
    clientes: datosO(clientes),
    vehiculos: datosO(vehiculos),
    autores: datosO(autores),
    aprobadas: datosO(aprobadas),
  }
}

// Con `?lead=`, de quién son estas cotizaciones: el nombre sólo con `leads.ver` y si la lectura lo devuelve (la RLS de leads); si no, nulo, sin distinguir un lead que no existe de uno que no
// se ve. Sin `?lead=`, `undefined`.
async function nombreDelLead(permisos: Permisos, id: string | undefined) {
  if (id === undefined) {
    return undefined
  }
  if (!puede(permisos, 'leads.ver')) {
    return { nombre: null }
  }
  return { nombre: datosO(await leerNombresDeLeads([id])).get(id) ?? null }
}

// La cotización de `?cotizacion=` cuando no está en la página (recargar, un enlace compartido, «Siguiente» con el resumen abierto): la lee el servidor, con la RLS de quien mira y su
// «Vencida» de la función del listado (`leerUnaDelListado`), y sus nombres aparte (sólo ella: una página de 100 con 100 clientes distintos ya llena el tope de ids de cada lectura).
// Si esa lectura falla, el listado no cae: `error`, y el resumen ofrece «Reintentar».
async function leerLaDelResumen(permisos: Permisos, id: string): Promise<LecturaDelServidor> {
  try {
    const fila = datosO(await leerUnaDelListado(id))
    if (fila === null) {
      return { id, estado: 'no_disponible' }
    }
    const [cotizacion] = filasConNombres([fila], await nombresDe(permisos, [fila]))
    return cotizacion === undefined ? { id, estado: 'error' } : { id, estado: 'listo', cotizacion }
  } catch {
    return { id, estado: 'error' }
  }
}

// Lo que el área `papelera` suma al grupo «Más» de «Vista y opciones» (4.24), sólo si quien mira lo vería: así «Más» nunca queda vacío.
function juntoDelListado(permisos: Permisos): ReactNode {
  const { Junto, hayJunto } = HUECOS_DE_PAPELERA_EN_EL_LISTADO
  if (Junto === undefined || hayJunto?.(permisos) === false) {
    return undefined
  }
  return <Junto permisos={permisos} />
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/cotizaciones'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  // Los orígenes con `cotizaciones.ver` (también los desactivados: sus cotizaciones siguen ahí).
  const todos = datosO(await getOrigenes(true))
  const visibles = todos.filter((origen) => puede(sesion.permisos, 'cotizaciones.ver', origen.id))
  if (visibles.length === 0) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver cotizaciones en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  const esquema = esquemaDelListado(visibles)
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia: sesion.preferencias.porPagina,
    maximo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  })
  const pedido = pedidoDelListado(leerFiltros(esquema, parametros), {
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano,
    vehiculo: unParametro(parametros[CLAVE_DE_VEHICULO]),
    lead: unParametro(parametros[CLAVE_DE_LEAD]),
  })
  const pagina = datosO(await leerListadoDeCotizaciones(pedido))
  // La del resumen, si la URL trae una que no está en la página; los nombres de la página, en paralelo.
  const idDelResumenUrl = idDelResumen(unParametro(parametros[CLAVE_DE_RESUMEN_DE_COTIZACION]))
  const faltaLaDelResumen =
    idDelResumenUrl !== null && !pagina.filas.some((fila) => fila.id === idDelResumenUrl)
  const [nombres, delServidor, deUnLead, vistas] = await Promise.all([
    nombresDe(sesion.permisos, pagina.filas),
    faltaLaDelResumen ? leerLaDelResumen(sesion.permisos, idDelResumenUrl) : null,
    nombreDelLead(sesion.permisos, pedido.leadId),
    leerVistas('cotizaciones'),
  ])
  const filas = filasConNombres(pagina.filas, nombres)
  // El «⋯» de cada fila: su versión, sus marcas y lo que ofrece a quien mira (tres lecturas por clave primaria para toda la página).
  const menus = await menusDeLaPagina(sesion, filas)
  // Lo que cada pestaña del resumen deja hacer (adjuntar y moderar): las de la página y la que abrió la URL.
  const quienes = quienesDelResumen(sesion, filas, delServidor)
  // Con `?vehiculo=`, de quién son estas cotizaciones: el título sólo si quien mira ve el vehículo (la lectura es nula si no existe o no se ve).
  const deUnVehiculo =
    pedido.vehiculoId === undefined
      ? undefined
      : { titulo: datosO(await leerVehiculo(pedido.vehiculoId))?.titulo ?? null }
  const origenDeNueva = origenParaNueva(sesion.permisos, visibles, pedido.origenId)

  return (
    // El resumen de `?cotizacion=` y las filas de la página marcan lo visto en el módulo (una lectura por página).
    <MarcasDeVistoDeLaPagina
      modulo="cotizaciones"
      consultas={[
        {
          tipo: 'cotizacion',
          ids: pagina.filas.map((fila) => fila.id),
          parametro: CLAVE_DE_RESUMEN_DE_COTIZACION,
        },
      ]}
    >
      <ListadoConAcciones
        esquema={esquema}
        pagina={{ ...pagina, filas }}
        acotada={pagina.acotada}
        vistas={datosO(vistas)}
        menus={menus}
        quienesDelResumen={quienes}
        aprobarEn={origenesCon(sesion.permisos, 'cotizaciones.aprobar')}
        delServidor={delServidor}
        porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_COTIZACIONES) }}
        origenes={visibles.map((origen) => ({ id: origen.id, nombre: origen.nombre }))}
        {...(deUnVehiculo === undefined ? {} : { vehiculo: deUnVehiculo })}
        {...(deUnLead === undefined ? {} : { lead: deUnLead })}
        rutaDeNueva={
          origenDeNueva === null ? null : rutaDeLaHoja({ origen: origenDeNueva, lead: null })
        }
        junto={juntoDelListado(sesion.permisos)}
      />
    </MarcasDeVistoDeLaPagina>
  )
}
