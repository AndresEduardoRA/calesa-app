// El catálogo de colores (tabla `tonos`) del editor de la fórmula, desde el navegador y con la sesión de quien edita: el color de una banda en su panel y las
// bandas de la planilla, que se pintan con sus colores (claro y oscuro, por `<EstiloDeTonos>`). Una lectura al montarse. La policy `tonos: leer` la abre a todo
// `authenticated`; el catálogo no pasa de 48 (`_tonos_tope()`).
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { esquemaId } from '../../entities/nodos'
import { TOPE_DE_TONOS_DEL_EDITOR } from '../../entities/formula/grupos'

type Colores = { fondo: string; borde: string; tinta: string }
export type TonoDelCatalogo = { clave: string; nombre: string; claro: Colores; oscuro: Colores }

const esquemaDeLosTonos = z.array(
  z.object({
    clave: esquemaId,
    nombre: z.string(),
    claro_fondo: z.string(),
    claro_borde: z.string(),
    claro_tinta: z.string(),
    oscuro_fondo: z.string(),
    oscuro_borde: z.string(),
    oscuro_tinta: z.string(),
  }),
)

// El catálogo entero en orden de nombre: `tonos_nombre_unico (nombre)`. Los colores llegan como los guarda la base; `<EstiloDeTonos>` vuelve a validar cada uno.
export async function leerTonosDelCatalogo(): Promise<Resultado<TonoDelCatalogo[]>> {
  const { data, error } = await createClient()
    .from('tonos')
    .select(
      'clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta',
    )
    .order('nombre')
    .limit(TOPE_DE_TONOS_DEL_EDITOR)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const tonos = esquemaDeLosTonos.safeParse(data)
  if (!tonos.success) return fallo('inesperado', 'No pudimos leer los colores.')
  return ok(
    tonos.data.map((t) => ({
      clave: t.clave,
      nombre: t.nombre,
      claro: { fondo: t.claro_fondo, borde: t.claro_borde, tinta: t.claro_tinta },
      oscuro: { fondo: t.oscuro_fondo, borde: t.oscuro_borde, tinta: t.oscuro_tinta },
    })),
  )
}
