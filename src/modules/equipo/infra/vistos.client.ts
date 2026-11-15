// «Visto», desde el navegador y con la sesión de quien mira (la RLS de `vistos` es de fila propia): registrar al abrir y leer lo de una página.
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  lecturaDeVistosDesde,
  tandasDeIds,
  TIPOS_DEL_MODULO,
  ultimoDelContexto,
  type ConsultaDeVistos,
  type LecturaDeVistos,
  type ModuloDeVistos,
  type TipoDeVistos,
} from '../entities/vistos'

// Un registro abierto en un módulo. Un fallo no se dice: marcar visto nunca frena lo que la persona hacía.
export async function registrarVisto(modulo: ModuloDeVistos, tipo: TipoDeVistos, id: string) {
  await createClient().rpc('visto_registrar', { p_modulo: modulo, p_tipo: tipo, p_id: id })
}

const esquemaDeTiempos = z.array(
  z.object({ tipo: z.string(), referencia_id: z.guid(), visto_en: z.string() }),
)

type Cliente = ReturnType<typeof createClient>

// Lo visto de un tipo: sus tandas de `vistos_de` (hasta 100 ids cada una, por la PK) en paralelo; con `[]` si no trae ids, así se lee igual su
// último. Nulo si alguna falla.
async function leerUnTipo(
  cliente: Cliente,
  modulo: ModuloDeVistos,
  tipo: TipoDeVistos,
  ids: readonly string[],
): Promise<LecturaDeVistos | null> {
  const tandas = tandasDeIds(ids)
  const lecturas = await Promise.all(
    (tandas.length === 0 ? [[]] : tandas).map(async (p_ids) => {
      const { data, error } = await cliente.rpc('vistos_de', {
        p_modulo: modulo,
        p_tipo: tipo,
        p_ids,
      })
      return error ? null : lecturaDeVistosDesde(data)
    }),
  )
  const vistos = new Set<string>()
  for (const lectura of lecturas) {
    if (lectura === null) return null
    for (const id of lectura.vistos) vistos.add(id)
  }
  return { vistos, ultimo: lecturas[0]?.ultimo ?? null }
}

// Con más de un tipo con último (la agenda: evento y tarea), cuál es el más reciente: un `select` por la PK (`vistos_pkey`: usuario por la
// policy, módulo, `tipo = any` y `referencia_id = any`, ≤ 1 fila por tipo). Nulo si no se pudo leer.
async function ultimoMasReciente(
  cliente: Cliente,
  modulo: ModuloDeVistos,
  ultimos: readonly { tipo: TipoDeVistos; id: string }[],
): Promise<{ id: string | null } | null> {
  const { data, error } = await cliente
    .from('vistos')
    .select('tipo, referencia_id, visto_en')
    .eq('modulo', modulo)
    .in(
      'tipo',
      ultimos.map((u) => u.tipo),
    )
    .in(
      'referencia_id',
      ultimos.map((u) => u.id),
    )
    .limit(ultimos.length)
  const tiempos = esquemaDeTiempos.safeParse(data)
  if (error || !tiempos.success) return null
  return {
    id: ultimoDelContexto(tiempos.data.map((t) => ({ id: t.referencia_id, vistoEn: t.visto_en }))),
  }
}

// Lo visto en una pantalla y el último visto del módulo (el más reciente de cualquiera de sus tipos). Nulo si algo no se pudo leer: la lista se
// ve sin marcas, nunca con dos «Último visto».
export async function leerVistosDelContexto(
  modulo: ModuloDeVistos,
  consultas: readonly ConsultaDeVistos[],
): Promise<LecturaDeVistos | null> {
  try {
    const cliente = createClient()
    const lecturas = await Promise.all(
      TIPOS_DEL_MODULO[modulo].map(async (tipo) => ({
        tipo,
        lectura: await leerUnTipo(
          cliente,
          modulo,
          tipo,
          consultas.find((c) => c.tipo === tipo)?.ids ?? [],
        ),
      })),
    )
    const vistos = new Set<string>()
    const ultimos: { tipo: TipoDeVistos; id: string }[] = []
    for (const { tipo, lectura } of lecturas) {
      if (lectura === null) return null
      for (const id of lectura.vistos) vistos.add(id)
      if (lectura.ultimo !== null) ultimos.push({ tipo, id: lectura.ultimo })
    }
    if (ultimos.length <= 1) return { vistos, ultimo: ultimos[0]?.id ?? null }
    const mejor = await ultimoMasReciente(cliente, modulo, ultimos)
    return mejor === null ? null : { vistos, ultimo: mejor.id }
  } catch {
    return null
  }
}
