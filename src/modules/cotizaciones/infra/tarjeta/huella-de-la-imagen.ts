import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquemaDeLaHuella = z.string().min(1).max(64)

// La huella de la imagen de la tarjeta para quien la pide (`cotizacion_imagen_huella()`, con su sesión: lecturas por clave primaria e índice único): la base de
// la ETag de `GET /cotizaciones/<id>/imagen`. Lo que no existe, está en la papelera o no se ve (42501) es `no_encontrado`, como el PDF.
export async function getHuellaDeLaImagen(id: string): Promise<Resultado<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizacion_imagen_huella', { p_cotizacion: id })
  if (error) {
    return error.code === '42501'
      ? fallo('no_encontrado', 'Esta cotización ya no está disponible.')
      : { ok: false, error: errorDePostgrest(error) }
  }
  const huella = esquemaDeLaHuella.safeParse(data)
  return huella.success
    ? ok(huella.data)
    : fallo('inesperado', 'No se pudo leer la huella de la imagen.')
}
