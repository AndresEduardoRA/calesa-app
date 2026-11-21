// Lo que leen y escriben las plantillas de V1 sobre un cliente (el de la sesión de quien configura: la base vuelve a pedir `cotizaciones.configurar` del origen y
// las policies recortan lo que no ve). Sin `server-only`, para probarlo con un cliente falso. docs/COTIZADOR.md › «Plantillas de V1».
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import { TOPE_DE_TONOS } from '../../entities/plantilla/lectura-de-la-plantilla'
import type { ColorDelCatalogo } from '../../entities/plantillas-de-v1/colores'
import type { Aplicada, PedidoDeAplicar } from '../../entities/plantillas-de-v1/pedido'

type Cliente = SupabaseClient<Database>

// La versión como el texto de la base, con sus microsegundos: un `Date` los pierde y la esperada ya no coincide.
const esquemaDeHora = z.iso.datetime({ offset: true })

export type EstadoParaPlantillasDeV1 = {
  readonly formula: {
    readonly creadoPor: string | null
    readonly autor: string | null
    readonly actualizadoEn: string
  } | null
  readonly tarjeta: { readonly actualizadoEn: string } | null
  readonly catalogo: readonly ColorDelCatalogo[]
}

const esquemaDeBorrador = z.object({ actualizado_en: esquemaDeHora })
const esquemaDelBorradorDeLaFormula = esquemaDeBorrador.extend({ creado_por: z.guid().nullable() })
const esquemaDelCatalogo = z.array(
  z.object({ clave: z.string(), nombre: z.string(), hex: z.string() }),
)

const NADA = { data: [], error: null }

// Sin fórmula del origen no hay borradores: no se consulta.
const siHay = <T>(formulaDelOrigenId: string | null, consulta: (id: string) => T) =>
  formulaDelOrigenId === null ? NADA : consulta(formulaDelOrigenId)

// Los dos borradores de una fórmula del origen (la que escribe `cotizacion_paquete_aplicar()` con `p_formula_del_origen`; nula: sin borradores) y el catálogo de colores, en paralelo; después el nombre de quien empezó el borrador de la fórmula (la tarjeta no lo guarda).
export async function leerEstadoParaPlantillasDeV1(
  cliente: Cliente,
  formulaDelOrigenId: string | null,
): Promise<Resultado<EstadoParaPlantillasDeV1>> {
  const [formula, tarjeta, tonos] = await Promise.all([
    // `formulas_borrador_unico`: índice único parcial por `formula_del_origen_id` donde `estado = 'borrador'`.
    siHay(formulaDelOrigenId, (id) =>
      cliente
        .from('formulas')
        .select('creado_por, actualizado_en')
        .eq('formula_del_origen_id', id)
        .eq('estado', 'borrador')
        .limit(1),
    ),
    // `plantillas_borrador_unico`, igual.
    siHay(formulaDelOrigenId, (id) =>
      cliente
        .from('plantillas_tarjeta')
        .select('actualizado_en')
        .eq('formula_del_origen_id', id)
        .eq('estado', 'borrador')
        .limit(1),
    ),
    // El catálogo entero: la base no deja crear un 49.º (`_tonos_tope()`).
    cliente.from('tonos').select('clave, nombre, hex').order('nombre').limit(TOPE_DE_TONOS),
  ])
  const error = formula.error ?? tarjeta.error ?? tonos.error
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const f = z.array(esquemaDelBorradorDeLaFormula).max(1).safeParse(formula.data)
  const t = z.array(esquemaDeBorrador).max(1).safeParse(tarjeta.data)
  const c = esquemaDelCatalogo.safeParse(tonos.data)
  if (!f.success || !t.success || !c.success) return fallo('inesperado', NO_SE_LEYO)
  const borrador = f.data[0]
  const autor = borrador?.creado_por == null ? null : await nombreDe(cliente, borrador.creado_por)
  return ok({
    formula:
      borrador === undefined
        ? null
        : { creadoPor: borrador.creado_por, autor, actualizadoEn: borrador.actualizado_en },
    tarjeta: t.data[0] === undefined ? null : { actualizadoEn: t.data[0].actualizado_en },
    catalogo: c.data,
  })
}

// El nombre de una persona por la clave primaria de `perfiles` (`perfiles_pkey`); sin nombre, su correo; si no se lee, nulo («Alguien»).
async function nombreDe(cliente: Cliente, id: string): Promise<string | null> {
  const { data, error } = await cliente
    .from('perfiles')
    .select('nombre, email')
    .eq('id', id)
    .limit(1)
  const fila = error
    ? undefined
    : z
        .array(z.object({ nombre: z.string().nullable(), email: z.string().nullable() }))
        .safeParse(data).data?.[0]
  const nombre = fila?.nombre?.trim() || fila?.email?.trim() || ''
  return nombre === '' ? null : nombre
}

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const esquemaDeAplicada = z.object({
  formula: z.object({ id: z.guid(), actualizado_en: esquemaDeHora }),
  plantilla: esquemaDeHora,
  colores: z.array(z.string()),
})

type ErrorDeLaRpc = { code?: string | null; message: string; hint?: string | null }

// Un rechazo de la base: el PT409, tal cual (persona y hora); el lugar en el catálogo, con su texto; una regla de la forma con su `donde`. Un 22023 o un PT409
// escritos para la persona no pasan por `errorDePostgrest()`, que cambia por el genérico un texto con «column» o «relation».
export function rechazoDeAplicar(error: ErrorDeLaRpc): ResultadoDeAccion<never> {
  if (error.code === 'PT409') return conflicto(error.message)
  if (error.code === '22023') {
    return error.hint === 'colores'
      ? fallo('regla', error.message)
      : fallo(
          'regla',
          `La base rechazó la plantilla: ${error.message}${error.hint ? ` (${error.hint})` : ''}.`,
        )
  }
  return { ok: false, error: errorDePostgrest(error) }
}

// «Crear»: la base toma la esperada nula como crear. Los tipos generados la dan como `string` (sin valor por omisión) y un `undefined` no viaja en el JSON.
const ESPERADA_NULA = null as unknown as string

export async function aplicarPlantillaDeV1(
  cliente: Cliente,
  { origenId, formulaDelOrigenId, pedido, formulaEsperada, plantillaEsperada }: PedidoDeAplicar,
): Promise<ResultadoDeAccion<Aplicada>> {
  const { data, error } = await cliente.rpc('cotizacion_paquete_aplicar', {
    p_origen: origenId,
    p_paquete: pedido as unknown as Json,
    p_formula_esperada: formulaEsperada ?? ESPERADA_NULA,
    p_plantilla_esperada: plantillaEsperada ?? ESPERADA_NULA,
    p_formula_del_origen: formulaDelOrigenId,
  })
  if (error) return rechazoDeAplicar(error)
  const leida = esquemaDeAplicada.safeParse(data)
  return leida.success
    ? ok({ formula: leida.data.formula.actualizado_en, plantilla: leida.data.plantilla })
    : fallo('inesperado', NO_SE_LEYO)
}
