import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { autorVisible } from '../../entities/historial-del-vehiculo'

// El asesor de la tarjeta tal como lo lee la base: la foto es la ruta en el bucket `avatares` (la vuelve URL quien dibuja).
export type AsesorQueMira = {
  nombre: string
  telefono: string | null
  cargo: string | null
  fotoRuta: string | null
}

const esquemaDelPerfil = z.array(
  z.object({
    nombre: z.string(),
    email: z.string(),
    whatsapp_web: z.string().nullable(),
    cargo_web: z.string().nullable(),
    avatar_ruta: z.string().nullable(),
  }),
)

// Lo que se escribió con espacios es «sin ese dato».
const conTexto = (texto: string | null) => (texto === null || texto.trim() === '' ? null : texto)

// El asesor de la tarjeta: quien la mira o la comparte, nunca quien la creó (glosario: «Asesor (de la tarjeta)»). Con «Ver como», la persona real: la perspectiva
// cambia permisos, no quién es. Una lectura de `perfiles` por clave primaria (`perfiles_pkey`, `limit(1)`) con el id verificado de `getClaims()`; la policy
// «perfiles: leer» deja ver a todo usuario activo. `cache()`: la página, el PDF de la hermana y la referencia la piden en el mismo request. Sin sesión o sin
// perfil, nulo.
export const getAsesorQueMira = cache(async (): Promise<Resultado<AsesorQueMira | null>> => {
  const supabase = await createClient()
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims.sub
  if (!yo) {
    return ok(null)
  }
  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, email, whatsapp_web, cargo_web, avatar_ruta')
    .eq('id', yo)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDelPerfil.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer tu perfil.')
  }
  const perfil = filas.data[0]
  return ok(
    perfil === undefined
      ? null
      : {
          nombre: autorVisible(perfil),
          telefono: conTexto(perfil.whatsapp_web),
          cargo: conTexto(perfil.cargo_web),
          fotoRuta: conTexto(perfil.avatar_ruta),
        },
  )
})
