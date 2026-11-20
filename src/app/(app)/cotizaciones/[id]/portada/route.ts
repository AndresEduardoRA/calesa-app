import { z } from 'zod'
import {
  anchoDeLaPortada,
  armarLaPortada,
  bajarLaPortada,
  CLAVE_DEL_ANCHO,
  etiquetaDeLaPortada,
  guardarLaPortada,
  leerLaPortada,
  miniaturaDeLaPortada,
  queHacerConLaPortada,
  type ContextoCompartido,
  type QueHacerConLaPortada,
} from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'
import {
  asesorQueMira,
  clienteDe,
  oNulo,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../datos-de-la-tarjeta'

// La portada de una cotización guardada (`docs/COTIZADOR.md` › «La portada de la cotización»): la imagen de su tarjeta de lo guardado, en WebP, con la sesión de
// quien la pide (la base y las policies del bucket deciden; nunca la secret key).
//
//   GET /cotizaciones/<id>/portada[?ancho=480]
//   200 image/webp | 304 | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// Con `?ancho=480` (la miniatura de las listas; otro valor es la grande) se achica al responder lo bajado o lo armado, con su propia ETag (`"<clave>-480"`): el bucket guarda
// sólo la grande.
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

type Ancho = ReturnType<typeof anchoDeLaPortada>

// La compartida se revalida con su clave (`no-cache`: el navegador pregunta cada vez y recibe un 304 barato); la propia no se guarda en ningún lado.
const cabecerasDe = (clave: string | null, ancho: Ancho) =>
  clave === null
    ? SIN_GUARDAR
    : {
        'Cache-Control': 'private, no-cache',
        ETag: etiquetaDeLaPortada(clave, ancho),
        ...SIN_ADIVINAR,
      }

// La imagen en el tamaño pedido: la grande tal cual, o achicada a la miniatura. Si no se pudo achicar, 500 (la portada ofrece «Reintentar»).
async function imagen(bytes: Uint8Array<ArrayBuffer>, clave: string | null, ancho: Ancho) {
  if (ancho === null) {
    return new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': 'image/webp', ...cabecerasDe(clave, null) },
    })
  }
  const chica = await miniaturaDeLaPortada(bytes, ancho)
  return chica.ok
    ? new Response(chica.data, {
        status: 200,
        headers: { 'Content-Type': 'image/webp', ...cabecerasDe(clave, ancho) },
      })
    : texto(NO_SE_PUDO, 500)
}

// Lo que dibuja la portada de quien no ve todo: lo que esa persona ve, como el PDF (el cliente sólo con `leads.ver`; un error al leerlo, sin ese dato).
async function contextoPropio(
  permisos: Permisos,
  cotizacion: { leadId: string | null; vehiculoId: string | null },
): Promise<ContextoCompartido> {
  const [cliente, vehiculo, asesor] = await Promise.all([
    oNulo(clienteDe(permisos, cotizacion.leadId)),
    oNulo(vehiculoDe(cotizacion.vehiculoId)),
    asesorQueMira(),
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
  { clave, ancho }: { clave: string; ancho: Ancho },
): Promise<Response> {
  const compartido = que.contexto
  const armada = await armarLaPortada(
    id,
    (hoja) => compartido ?? contextoPropio(permisos, hoja.cotizacion),
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
  return imagen(armada.data.bytes, compartido === null ? null : clave, ancho)
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
  const ancho = anchoDeLaPortada(new URL(peticion.url).searchParams.get(CLAVE_DEL_ANCHO))
  const pedido = {
    siNoneMatch: peticion.headers.get('if-none-match'),
    perspectivaPropia: sesion.perspectiva.rol === null,
    ancho,
  }
  const clave = estado.data.claveVigente
  const que = queHacerConLaPortada(estado.data, pedido)
  if (que.tipo === 'sin_cambios') {
    return new Response(null, { status: 304, headers: cabecerasDe(clave, ancho) })
  }
  if (que.tipo === 'generar') {
    return entregarArmada(sesion.permisos, id, que, { clave, ancho })
  }
  const bajada = await bajarLaPortada(que.ruta)
  if (bajada.ok) {
    return imagen(bajada.data, clave, ancho)
  }
  // El objeto no está (o no se pudo bajar): se arma como si no hubiera guardada.
  const sinGuardada = queHacerConLaPortada({ ...estado.data, ruta: null }, pedido)
  return sinGuardada.tipo === 'generar'
    ? entregarArmada(sesion.permisos, id, sinGuardada, { clave, ancho })
    : texto(NO_SE_PUDO, 500)
}
