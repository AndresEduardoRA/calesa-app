import 'server-only'
import { createHash } from 'node:crypto'
import { conflicto, errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  BUCKET_DE_LA_PORTADA,
  estadoDeLaPortadaDesde,
  rutaDelObjetoDeLaPortada,
  type EstadoDeLaPortada,
} from '../../entities/tarjeta/portada'

// La portada de la cotización en el servidor (`docs/COTIZADOR.md` › «La portada de la cotización»), siempre con la sesión de quien pide (cliente por request: la
// base y las policies del bucket deciden; nunca la secret key).

// El estado para quien pide (`cotizacion_portada`: una lectura por clave primaria). Lo que no existe, está en la papelera o no se ve llega como `sin_permiso` (42501).
export async function getEstadoDeLaPortada(id: string): Promise<Resultado<EstadoDeLaPortada>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizacion_portada', { p_cotizacion: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const estado = estadoDeLaPortadaDesde(data)
  return estado === null ? fallo('inesperado', 'No se pudo leer la vista previa.') : ok(estado)
}

// Los bytes de la guardada, del bucket privado con la sesión de quien pide (la policy «cotizaciones: leer» pide ver la cotización).
export async function bajarLaPortada(ruta: string): Promise<Resultado<Uint8Array<ArrayBuffer>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(BUCKET_DE_LA_PORTADA).download(ruta)
  if (error) {
    return fallo('inesperado', 'No se pudo bajar la vista previa.')
  }
  return ok(new Uint8Array(await data.arrayBuffer()))
}

// Sube el WebP por su hash a la carpeta `portada/` de la cotización (la policy «cotizaciones: subir» pide poder guardarla) y devuelve la ruta. Sin `upsert` (no hay
// policy de update): «ya existe» es el mismo archivo, y cuenta como subido.
export async function subirLaPortada(
  id: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Resultado<string>> {
  const ruta = rutaDelObjetoDeLaPortada(id, createHash('sha256').update(bytes).digest('hex'))
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKET_DE_LA_PORTADA).upload(ruta, bytes, {
    contentType: 'image/webp',
    // El contenido de una ruta nunca cambia.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error && !/exists|duplicate/i.test(error.message)) {
    return fallo('inesperado', 'No se pudo subir la vista previa.')
  }
  return ok(ruta)
}

// Anota la subida (`cotizacion_portada_poner`). PT409 (la clave cambió mientras se armaba) es un `conflicto`: quien llama entrega su imagen sin guardarla.
export async function ponerLaPortada(
  id: string,
  ruta: string,
  clave: string,
): Promise<Resultado<null>> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cotizacion_portada_poner', {
    p_cotizacion: id,
    p_ruta: ruta,
    p_clave: clave,
  })
  if (error) {
    return error.code === 'PT409'
      ? conflicto(error.message)
      : { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}
