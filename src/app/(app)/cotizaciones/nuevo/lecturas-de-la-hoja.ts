import {
  aperturaDe,
  contarCotizacionesDelVehiculo,
  datosDelVehiculoDeLaHoja,
  eleccionesDeLaHoja,
  leerHojaParaCotizar,
  modoInicial,
  obligatoriosAlCotizar,
  recalcularAlAbrir,
} from '@/modules/cotizaciones'
import { leerClienteElegido, type ClienteElegido } from '@/modules/leads'
import { PANEL_DEL_CLIENTE } from '@/modules/leads/pantallas/cotizar'
import { integracionActiva } from '@/modules/empresa'
import { leerLayout, type OrigenResumen } from '@/modules/origenes'
import {
  datosParaElegirDe,
  editablesDe,
  leerVehiculo,
  permisoDeAlta,
  type Vehiculo,
} from '@/modules/vehiculos'
import {
  PANEL_DEL_VEHICULO,
  type AltaDelPanel,
  type ParaElegir,
} from '@/modules/vehiculos/pantallas/cotizar'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Las lecturas de la hoja de cotizar (servidor): lo que la página junta en paralelo antes de dibujar. Un archivo aparte de `page.tsx` (una responsabilidad: la composición).

// La hoja y, con la hoja abierta que ella entrega, el primer cálculo (4-28: el total es el de la versión y las tarifas que se dibujan): llega dibujada con sus valores y el
// navegador no pide nada al abrir. Un pedido más en serie, que se ahorra cuando no hay hoja que calcular (sin permiso, sin publicar).
export async function abrirLaHoja(origenId: string, vehiculoId: string | null) {
  const hoja = await leerHojaParaCotizar(origenId)
  const alAbrir =
    hoja.ok && hoja.data.estado === 'lista'
      ? await recalcularAlAbrir({
          origenId,
          vehiculoId,
          abierta: hoja.data.abierta,
          modoTc: modoInicial(hoja.data.cabecera),
        })
      : null
  return {
    apertura: aperturaDe(hoja, alAbrir?.resultado ?? null),
    vehiculoSoltado: alAbrir?.vehiculoSoltado ?? false,
  }
}

export type Quien = { permisos: Permisos; usuarioId: string }

// El vehículo de la URL, con si quien mira lo puede editar (en serie: `editablesDe` necesita el vehículo leído; casi siempre sin ir a la base); null si no vino, no existe o
// no se ve.
export async function elegidoDeLaUrl(quien: Quien, id: string | null) {
  if (id === null) {
    return null
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok || !leido.data) {
    return null
  }
  const editables = await editablesDe(quien, [leido.data])
  return { vehiculo: leido.data, editable: editables.has(leido.data.id) }
}

export type VehiculoDeLaUrl = Awaited<ReturnType<typeof elegidoDeLaUrl>>

// El lead de la URL para la barra del cliente (4.14-3b), con la sesión de quien mira: null si no vino, si quien mira no ve los leads o si la lectura no lo encontró (no
// existe, está en la papelera o no se ve: la hoja y las pestañas de origen lo sueltan, y guardar pide elegir otro). Un error de la lectura sube al `error.tsx`: no es «no se ve».
export async function clienteDeLaUrl(
  permisos: Permisos,
  id: string | null,
): Promise<ClienteElegido | null> {
  return id === null || !puede(permisos, 'leads.ver') ? null : datosO(await leerClienteElegido(id))
}

// El layout del origen sólo hace falta con un vehículo: dice qué datos del vehículo se eligen en el panel.
export const layoutSiHayVehiculo = (origenId: string, vehiculo: string | null) =>
  vehiculo === null ? null : leerLayout(origenId, { conUso: false })

// Lo que el panel ofrece elegir del vehículo entre las filas de una tabla de la hoja (4.14-2c3, el tipo de vehículo del transporte): sólo con un elegido y su layout.
export function paraElegirDe(
  hoja: Parameters<typeof datosDelVehiculoDeLaHoja>[0],
  elegido: { vehiculo: Vehiculo; editable: boolean } | null,
  layout: Awaited<ReturnType<typeof leerLayout>> | null,
): ParaElegir | null {
  if (elegido === null || layout === null || !layout.ok) {
    return null
  }
  const datos = datosDelVehiculoDeLaHoja(hoja)
  return datos.length === 0
    ? null
    : datosParaElegirDe(elegido.vehiculo, datos, layout.data.campos, elegido.editable)
}

// Los campos que quien mira elige en el panel: la celda sin valor por uno de ellos dice dónde se elige.
export const camposQueSeEligen = (paraElegir: ParaElegir | null): string[] =>
  paraElegir?.editable ? paraElegir.datos.map((dato) => dato.campo) : []

// Lo que el panel del vehículo necesita para dar de alta desde él: sólo si quien mira ve los vehículos del origen y puede crearlos en él (el origen de la hoja está
// siempre activo). Se lee a la vez que la hoja. El layout del origen no viaja: el alta lo lee desde el navegador al abrirse (P2 del 4.14-2c).
export async function altaDelPanelDe(
  permisos: Permisos,
  origen: OrigenResumen,
): Promise<AltaDelPanel | null> {
  if (
    !puede(permisos, 'vehiculos.ver', origen.id) ||
    permisoDeAlta(permisos, origen, 'cotizar').estado !== 'habilitado'
  ) {
    return null
  }
  const activa = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  return {
    origen,
    apibara: { activa, puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar') },
  }
}

// Lo que la página junta en paralelo antes de dibujar. El vehículo de la barra y su «Cotizado (n)» se leen a la vez que la hoja; si la hoja lo suelta, la barra queda sin él. Con un
// vehículo, el layout del origen (qué datos del vehículo se eligen en el panel) también va en paralelo.
export async function leerLoDeLaHoja(
  sesion: Quien,
  origen: OrigenResumen,
  de: { lead: string | null; vehiculo: string | null },
) {
  const [abierta, leido, conteo, alta, layout, cliente] = await Promise.all([
    abrirLaHoja(origen.id, de.vehiculo),
    elegidoDeLaUrl(sesion, de.vehiculo),
    de.vehiculo === null ? null : contarCotizacionesDelVehiculo(de.vehiculo),
    altaDelPanelDe(sesion.permisos, origen),
    layoutSiHayVehiculo(origen.id, de.vehiculo),
    clienteDeLaUrl(sesion.permisos, de.lead),
  ])
  return { ...abierta, leido, conteo, alta, layout, cliente }
}

// Qué pide el rol de quien mira en este origen y cómo se elige. Con «Ver como» son los permisos del rol elegido (`sesion.permisos`); la base decide con los reales, así que la hoja
// nunca afloja lo que ella exige. Al navegador viajan booleanos y textos.
export function reglasDeLaHoja(permisos: Permisos, origenId: string) {
  return {
    obligatorios: obligatoriosAlCotizar(permisos, origenId),
    elecciones: eleccionesDeLaHoja(permisos, origenId, {
      cliente: PANEL_DEL_CLIENTE,
      vehiculo: PANEL_DEL_VEHICULO,
    }),
  }
}
