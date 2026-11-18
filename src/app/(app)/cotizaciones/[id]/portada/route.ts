import { z } from 'zod'
import {
  armarLaPortada,
  bajarLaPortada,
  etiquetaDeLaPortada,
  guardarLaPortada,
  leerLaPortada,
  queHacerConLaPortada,
  type ContextoCompartido,
  type QueHacerConLaPortada,
} from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'
import {
  asesorDe,
  clienteDe,
  oNulo,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../datos-de-la-tarjeta'

// La portada de una cotización guardada (`docs/COTIZADOR.md` › «La portada de la cotización»): la imagen de su tarjeta de lo guardado, en WebP, con la sesión de
// quien la pide (la base y las policies del bucket deciden; nunca la secret key).
//
//   GET /cotizaciones/<id>/portada
//   200 image/webp | 304 | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// La compartida (quien ve todo lo que dibuja, sin «Ver como») va con `ETag` = la clave y se revalida (304 sin bajar ni armar nada); la guardada al día se baja del
// bucket; si falta o quedó vieja se arma y, si quien pide puede guardarla, se guarda **antes de responder**: en `after()` la sesión podría renovarse con la respuesta
// ya enviada y rotar el refresh token del navegador (`docs/LECCIONES.md` › «Server Actions, Next y React»). Quien no ve todo recibe una armada con lo suyo, sin
// guardar y sin `ETag`. Lo que no existe, está en la papelera o no se ve es el mismo 404 que el PDF, nunca 403.
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar la vista previa. Vuelve a intentarlo.'
const SIN_ADIVINAR = { 'X-Content-Type-Options': 'nosniff' }
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', ...SIN_ADIVINAR }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

// La compartida se revalida con su clave (`no-cache`: el navegador pregunta cada vez y recibe un 304 barato); la propia no se guarda en ningún lado.
const cabecerasDe = (clave: string | null) =>
  clave === null
    ? SIN_GUARDAR
    : { 'Cache-Control': 'private, no-cache', ETag: etiquetaDeLaPortada(clave), ...SIN_ADIVINAR }

const imagen = (bytes: Uint8Array<ArrayBuffer>, clave: string | null) =>
  new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'image/webp', ...cabecerasDe(clave) },
  })

// Lo que dibuja la portada de quien no ve todo: lo que esa persona ve, como el PDF (el cliente sólo con `leads.ver`; un error al leerlo, sin ese dato).
async function contextoPropio(
  permisos: Permisos,
  id: string,
  cotizacion: { leadId: string | null; vehiculoId: string | null },
): Promise<ContextoCompartido> {
  const [cliente, vehiculo, asesor] = await Promise.all([
    oNulo(clienteDe(permisos, cotizacion.leadId)),
    oNulo(vehiculoDe(cotizacion.vehiculoId)),
    asesorDe(id),
  ])
  return { cliente: cliente?.nombre ?? null, vehiculo: vehiculoDeLaTarjeta(vehiculo), asesor }
}

// Lo que no existe, está en la papelera o no se ve, 404; lo demás, 500.
const falla = (codigo: string) =>
  codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)

// Arma la portada (la compartida o la propia), la guarda si toca y la entrega. Si armarla falla, 500: nunca una vieja.
async function entregarArmada(
  permisos: Permisos,
  id: string,
  que: Extract<QueHacerConLaPortada, { tipo: 'generar' }>,
  clave: string,
): Promise<Response> {
  const compartido = que.contexto
  const armada = await armarLaPortada(
    id,
    (hoja) => compartido ?? contextoPropio(permisos, id, hoja.cotizacion),
  )
  if (!armada.ok) {
    return falla(armada.error.codigo)
  }
  if (que.guardar && armada.data.guardable) {
    // Con la clave que se leyó antes de leer la hoja: si cambió mientras se armaba, no se guarda (PT409) y se entrega igual.
    const guardada = await guardarLaPortada({ id, bytes: armada.data.bytes, clave })
    if (!guardada.ok) {
      console.error('[portada] No se pudo guardar la portada.', guardada.error)
    }
  }
  return imagen(armada.data.bytes, compartido === null ? null : clave)
}

export async function GET(
  peticion: Request,
  { params }: RouteContext<'/cotizaciones/[id]/portada'>,
) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  const sesion = await requerirSesion()
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_DISPONIBLE, 404)
  }
  const estado = await leerLaPortada(id)
  if (!estado.ok) {
    return falla(estado.error.codigo)
  }
  const pedido = {
    siNoneMatch: peticion.headers.get('if-none-match'),
    perspectivaPropia: sesion.perspectiva.rol === null,
  }
  const clave = estado.data.claveVigente
  const que = queHacerConLaPortada(estado.data, pedido)
  if (que.tipo === 'sin_cambios') {
    return new Response(null, { status: 304, headers: cabecerasDe(clave) })
  }
  if (que.tipo === 'generar') {
    return entregarArmada(sesion.permisos, id, que, clave)
  }
  const bajada = await bajarLaPortada(que.ruta)
  if (bajada.ok) {
    return imagen(bajada.data, clave)
  }
  // El objeto no está (o no se pudo bajar): se arma como si no hubiera guardada.
  const sinGuardada = queHacerConLaPortada({ ...estado.data, ruta: null }, pedido)
  return sinGuardada.tipo === 'generar'
    ? entregarArmada(sesion.permisos, id, sinGuardada, clave)
    : texto(NO_SE_PUDO, 500)
}
