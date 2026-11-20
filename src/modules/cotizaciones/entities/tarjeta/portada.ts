// La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»): la imagen de la tarjeta de una guardada, anotada en `cotizaciones_portadas` con la
// clave de lo que la armó. Lo que dice `cotizacion_portada()` y qué hace la ruta con eso. Sin I/O.
import { z } from 'zod'
import { autorVisible } from '../historial-del-vehiculo'
import type { AnchoDeLaPortada } from '../ruta-de-la-hoja'
import type { ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'

// El bucket privado donde va la portada: el de los adjuntos (`<cotización>/portada/<sha-256>.webp`), con sus policies.
export const BUCKET_DE_LA_PORTADA = 'cotizaciones'

// La ruta del objeto: por el hash del archivo, en la carpeta `portada/` de la cotización (lo exige `cotizacion_portada_poner`).
export const rutaDelObjetoDeLaPortada = (cotizacionId: string, sha256: string): string =>
  `${cotizacionId}/portada/${sha256}.webp`

// Lo que dibuja la tarjeta de una guardada y no sale de la fórmula: el cliente, el vehículo y quien la creó (ya como lo nombra la tarjeta). El de la portada
// compartida sale de la base (`contexto`, los mismos campos que mira la clave); el de quien no ve todo, de lo que esa persona ve.
export type ContextoCompartido = Pick<ContextoDeLaCotizacion, 'cliente' | 'vehiculo' | 'asesor'>

export type EstadoDeLaPortada = {
  // La guardada, o nulas si no hay.
  ruta: string | null
  clave: string | null
  // La de hoy: la ETag de la compartida. Texto opaco.
  claveVigente: string
  // Ve todo lo que dibuja la compartida (el cliente y el vehículo vivos): sólo entonces llega `contexto`.
  veTodo: boolean
  puedeGuardarla: boolean
  contexto: ContextoCompartido | null
}

const esquemaDelVehiculo = z.object({
  titulo: z.string(),
  lote: z.string().nullable(),
  vin: z.string().nullable(),
})

const esquemaDelEstado = z.object({
  ruta: z.string().min(1).nullable(),
  clave: z.string().min(1).nullable(),
  clave_vigente: z.string().min(1),
  ve_todo: z.boolean(),
  puede_guardarla: z.boolean(),
  contexto: z
    .object({
      cliente: z.string().nullable(),
      vehiculo: esquemaDelVehiculo.nullable(),
      asesor: z.object({ nombre: z.string(), email: z.string() }).nullable(),
    })
    .nullable(),
})

// La respuesta de `cotizacion_portada()`, o nulo si no tiene la forma. Sin `ve_todo` no hay contexto (aunque viniera) ni se puede guardar.
export function estadoDeLaPortadaDesde(json: unknown): EstadoDeLaPortada | null {
  const leido = esquemaDelEstado.safeParse(json)
  if (!leido.success) {
    return null
  }
  const e = leido.data
  const contexto =
    e.ve_todo && e.contexto !== null
      ? {
          cliente: e.contexto.cliente,
          vehiculo: e.contexto.vehiculo,
          asesor:
            e.contexto.asesor === null
              ? null
              : {
                  nombre: autorVisible(e.contexto.asesor),
                  telefono: null,
                  cargo: null,
                  foto: null,
                },
        }
      : null
  return {
    ruta: e.ruta,
    clave: e.clave,
    claveVigente: e.clave_vigente,
    veTodo: contexto !== null,
    puedeGuardarla: contexto !== null && e.puede_guardarla,
    contexto,
  }
}

// La ETag de la compartida: la clave entre comillas (una ETag fuerte); la de una miniatura lleva además su ancho (son otros bytes).
export const etiquetaDeLaPortada = (
  clave: string,
  ancho: AnchoDeLaPortada | null = null,
): string => (ancho === null ? `"${clave}"` : `"${clave}-${String(ancho)}"`)

// Si `If-None-Match` nombra esta clave (y esta variante): acepta la forma débil (`W/"…"`) y una lista separada por comas.
export function coincideLaEtiqueta(
  siNoneMatch: string | null,
  clave: string,
  ancho: AnchoDeLaPortada | null = null,
): boolean {
  if (siNoneMatch === null) {
    return false
  }
  const buscada = etiquetaDeLaPortada(clave, ancho)
  return siNoneMatch.split(',').some((parte) => parte.trim().replace(/^W\//, '') === buscada)
}

export type QueHacerConLaPortada =
  // El navegador ya tiene la de hoy: 304.
  | { tipo: 'sin_cambios' }
  // La guardada está al día: se baja del bucket.
  | { tipo: 'bajar'; ruta: string }
  // Se arma: con el contexto de la compartida, o (nulo) con el de quien pide; `guardar` si es la compartida y quien pide puede guardarla.
  | { tipo: 'generar'; contexto: ContextoCompartido | null; guardar: boolean }

// Qué hace la ruta con el estado. La compartida (la que se guarda y lleva ETag) es para quien ve todo lo que dibuja y mira con sus permisos (sin «Ver como»: la
// interfaz le mostraría menos que la imagen). Guardar, sólo la compartida, si quien pide puede y la guardada falta o quedó vieja.
// Con `ancho`, el 304 es contra la ETag de esa miniatura (el bucket guarda sólo la grande: lo bajado o armado se achica al responder).
export function queHacerConLaPortada(
  estado: EstadoDeLaPortada,
  {
    siNoneMatch,
    perspectivaPropia,
    ancho = null,
  }: { siNoneMatch: string | null; perspectivaPropia: boolean; ancho?: AnchoDeLaPortada | null },
): QueHacerConLaPortada {
  const contexto = perspectivaPropia ? estado.contexto : null
  if (contexto === null) {
    return { tipo: 'generar', contexto: null, guardar: false }
  }
  if (coincideLaEtiqueta(siNoneMatch, estado.claveVigente, ancho)) {
    return { tipo: 'sin_cambios' }
  }
  if (estado.ruta !== null && estado.clave === estado.claveVigente) {
    return { tipo: 'bajar', ruta: estado.ruta }
  }
  return { tipo: 'generar', contexto, guardar: estado.puedeGuardarla }
}
