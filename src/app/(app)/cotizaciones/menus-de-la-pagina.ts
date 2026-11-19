import {
  accionesDeModerar,
  leerMarcasDeLaPagina,
  motivoParaNoAprobar,
  motivoParaNoMarcar,
  puedeAprobar,
  puedeEnviarLaCotizacion,
  puedeGuardarDesdeElListado,
  puedeMarcarLaFinal,
  puedeModerarLaCotizacion,
  type CotizacionDelListado,
  type MarcasDeUnaFila,
  type LecturaDelServidor,
  type MenuDeUnaFila,
  type OfertasDelMenuDeCotizacion,
} from '@/modules/cotizaciones'
import type { QuienDelResumen } from '@/modules/cotizaciones/pantallas/listado'
import type { Permisos } from '@/shared/lib/permisos'
import { conLaDelResumen } from './la-del-resumen'

type Quien = { permisos: Permisos; usuarioId: string }

// Lo que ofrece el «⋯» de una cotización del listado, con las reglas de cada área sobre lo que la página ya leyó (`docs/UX.md` › «Cotizaciones»). Una acción ausente no existe para
// quien mira; una con `motivo` se ve apagada y lo dice. La base vuelve a decidir al actuar (RLS, permisos y versión de cada RPC): esto sólo elige qué se dibuja.
export function ofertasDeLaFila(
  fila: Pick<
    CotizacionDelListado,
    'clase' | 'origenId' | 'creadoPor' | 'vehiculoId' | 'leadId' | 'aprobada'
  >,
  marcas: Pick<MarcasDeUnaFila, 'estado' | 'reportesCount' | 'miMotivo'>,
  { permisos, usuarioId }: Quien,
): OfertasDelMenuDeCotizacion {
  const puedeGuardar = puedeGuardarDesdeElListado(fila, permisos, usuarioId)
  // Si la fila se ve, la cotización se ve: se comparte como se baja su PDF, sin clave propia (con el Modo Live, el menú no la dibuja).
  const ofertas: Record<string, { motivo: string | null }> = { compartir: { motivo: null } }
  // Ya es la aprobada de su vehículo: no hay qué aprobar.
  if (puedeAprobar(fila, permisos) && !fila.aprobada) {
    ofertas['aprobar'] = { motivo: motivoParaNoAprobar(fila, marcas) }
  }
  if (puedeMarcarLaFinal(fila, permisos)) {
    ofertas['final'] = { motivo: motivoParaNoMarcar(fila, puedeGuardar) }
  }
  ofertas['favorita'] = { motivo: null }
  ofertas['reportar'] = { motivo: null }
  if (puedeModerarLaCotizacion(fila, permisos)) {
    for (const accion of accionesDeModerar(marcas)) {
      ofertas[accion] = { motivo: null }
    }
  }
  if (puedeEnviarLaCotizacion(fila, puedeGuardar, permisos)) {
    ofertas['papelera'] = { motivo: null }
  }
  return ofertas
}

// El menú de cada fila de la página: sus marcas y versión (tres lecturas por clave primaria para toda la página) y lo que ofrece. Una fila sin marcas (la lectura falló, o ya no se ve)
// no tiene menú: no se ofrece lo que depende de una versión que no se leyó.
export async function menusDeLaPagina(
  quien: Quien,
  filas: readonly CotizacionDelListado[],
): Promise<Record<string, MenuDeUnaFila>> {
  const lectura = await leerMarcasDeLaPagina(filas.map((fila) => fila.id))
  if (!lectura.ok) {
    return {}
  }
  const menus: Record<string, MenuDeUnaFila> = {}
  for (const fila of filas) {
    const marcas = lectura.data.get(fila.id)
    if (marcas !== undefined) {
      menus[fila.id] = {
        actualizadoEn: marcas.actualizadoEn,
        favorita: marcas.favorita,
        miMotivo: marcas.miMotivo,
        ofertas: ofertasDeLaFila(fila, marcas, quien),
      }
    }
  }
  return menus
}

// Lo que quien mira puede hacer con cada cotización abierta en el resumen (adjuntar y moderar), con las mismas reglas del «⋯» y sobre lo que la página ya leyó: no pide nada a la base. Una
// fila de otra página (la que abrió la URL) entra con las suyas. La base decide al actuar.
export function quienesDelResumen(
  quien: Quien,
  filas: readonly CotizacionDelListado[],
  delServidor: LecturaDelServidor | null,
): Record<string, QuienDelResumen> {
  return Object.fromEntries(
    conLaDelResumen(filas, delServidor).map((fila) => [
      fila.id,
      {
        puedeAdjuntar: puedeGuardarDesdeElListado(fila, quien.permisos, quien.usuarioId),
        puedeModerar: puedeModerarLaCotizacion(fila, quien.permisos),
      },
    ]),
  )
}
