import { conteoCorto } from '@/shared/lib/conteo'
import type { FaseDelItem, FilaDeItem } from '../nucleo/item'

// Los grupos por paso de la hoja de `/repuestos/[id]` (glosario: «Grupo por paso»): los ítems de una misma fase bajo su encabezado, en el orden de los pasos, y
// «Sin fase» al final. Se arma en el navegador sobre lo que la hoja ya leyó (≤ 200 filas), O(n). Puro.

export const CLAVE_SIN_FASE = 'sin_fase'
export const TEXTO_SIN_FASE = 'Sin fase'

export type GrupoPorPaso = {
  // El id de la fase o `CLAVE_SIN_FASE`.
  clave: string
  fase: FaseDelItem | null
  // En el orden de la hoja (`creado_en, id`).
  filas: FilaDeItem[]
  // «Comprar · 3»; con la hoja topada, «Comprar · 37+».
  texto: string
}

/** «Comprar · 3» o, si la hoja no trae todo, «Comprar · 37+»: ningún conteo es un total. */
export function textoDelGrupo(nombre: string, n: number, hayMas: boolean): string {
  return `${nombre} · ${conteoCorto({ n, hayMas })}`
}

const porNombre = new Intl.Collator('es')

/**
 * Agrupa las filas por su fase. Los grupos van en el orden del flujo (`ordenDeLasFases`: el lugar de cada fase, también las jubiladas); una fase que no está en ese
 * orden va después de las conocidas, por nombre; «Sin fase» al final. Un paso sin ítems no sale. Sin orden (flujo sin fases o ilegible), un solo grupo «Sin fase» con
 * todos: no hay pasos que agrupar.
 */
export function agruparPorPaso(
  filas: readonly FilaDeItem[],
  ordenDeLasFases: ReadonlyMap<string, number> | null,
  hayMas: boolean,
): GrupoPorPaso[] {
  const porClave = new Map<string, { fase: FaseDelItem | null; filas: FilaDeItem[] }>()
  for (const fila of filas) {
    const fase = ordenDeLasFases === null ? null : fila.fase
    const clave = fase?.id ?? CLAVE_SIN_FASE
    const grupo = porClave.get(clave)
    if (grupo) grupo.filas.push(fila)
    else porClave.set(clave, { fase, filas: [fila] })
  }
  // Primero las fases del orden (por su lugar), luego las que no están en él (por nombre) y «Sin fase» al final.
  const rango = (fase: FaseDelItem | null) =>
    fase === null ? 2 : ordenDeLasFases?.has(fase.id) ? 0 : 1
  const grupos = [...porClave.entries()].map(([clave, g]) => ({ clave, ...g }))
  grupos.sort((a, b) => {
    const porRango = rango(a.fase) - rango(b.fase)
    if (porRango !== 0 || a.fase === null || b.fase === null) return porRango
    const porLugar = (ordenDeLasFases?.get(a.fase.id) ?? 0) - (ordenDeLasFases?.get(b.fase.id) ?? 0)
    return porLugar !== 0 ? porLugar : porNombre.compare(a.fase.nombre, b.fase.nombre)
  })
  return grupos.map((g) => ({
    ...g,
    texto: textoDelGrupo(g.fase?.nombre ?? TEXTO_SIN_FASE, g.filas.length, hayMas),
  }))
}
