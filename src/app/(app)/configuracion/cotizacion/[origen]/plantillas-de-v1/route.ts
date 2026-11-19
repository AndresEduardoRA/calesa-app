import { z } from 'zod'
import { leerPlantillasDeV1 } from '@/modules/cotizaciones'
import { getTiposCambio } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import { puede } from '@/shared/lib/permisos'

// Lo que el modal «Empezar desde una plantilla» necesita: las cuatro plantillas de V1 (cada una con la lectura de su tarjeta, sus avisos y si sus colores caben) y los
// borradores del origen con la versión que esperan. Compone lo que `cotizaciones` no importa: los tipos de cambio activos de la empresa y los campos activos del
// origen. Con la sesión de quien configura (la RLS decide; nunca la secret key). Se pide una vez por apertura, sin caché: lleva los borradores, que cambian.
//
//   GET /configuracion/cotizacion/<origen>/plantillas-de-v1
//   200 application/json (`DatosDePlantillasDeV1`) | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// Sin `cotizaciones.configurar` del origen, un id que no es un uuid o un origen que no existe: el mismo 404, nunca 403.
const NO_DISPONIBLE = 'Este origen ya no está disponible: no existe o ya no lo configuras.'
const NO_SE_PUDO = 'No se pudieron leer las plantillas.'
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/configuracion/cotizacion/[origen]/plantillas-de-v1'>,
) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  const sesion = await requerirSesion()
  const { origen: id } = await params
  if (!z.guid().safeParse(id).success || !puede(sesion.permisos, 'cotizaciones.configurar', id)) {
    return texto(NO_DISPONIBLE, 404)
  }
  const [origenes, tipos, layout] = await Promise.all([
    getOrigenes(true),
    getTiposCambio(),
    leerLayout(id, { conUso: false }),
  ])
  if (!origenes.ok || !layout.ok) return texto(NO_SE_PUDO, 500)
  const origen = origenes.data.find((uno) => uno.id === id)
  if (origen === undefined) return texto(NO_DISPONIBLE, 404)
  const datos = await leerPlantillasDeV1(
    { id, nombre: origen.nombre },
    {
      tiposDeCambio: tipos.map((t) => t.clave),
      campos: layout.data.campos.filter((c) => c.activo).map((c) => c.clave),
    },
    sesion.usuarioId,
  )
  if (!datos.ok) {
    return datos.error.codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)
  }
  return Response.json(datos.data, { headers: SIN_GUARDAR })
}
