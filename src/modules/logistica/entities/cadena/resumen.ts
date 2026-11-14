import { z } from 'zod'
import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'

// El número de cada fase de la cadena (`logistica_cadena_resumen()`), validado con Zod en el borde (ids con `z.guid()`; su `Returns` es `Json`). Cada cifra es un conteo con
// tope, nunca un total: «1.000+». Puro: ninguna lectura. Lo dibuja la gráfica de `/logistica`.

export type FaseDelResumen = {
  // Nulo: «Sin fase» (el texto lo pone la interfaz).
  faseId: string | null
  nombre: string | null
  color: string | null
  orden: number | null
  // Nulo sólo en «Sin fase»; falso = jubilada (sólo sale con vehículos).
  activa: boolean | null
  esFinal: boolean
  // Los días con que alerta; nulo si no alerta.
  demoraDias: number | null
  vehiculos: ConteoAcotado
  // Nulos si la fase no alerta.
  demorados: ConteoAcotado | null
  trabados: ConteoAcotado | null
}

export type ResumenDeLaCadena = { fases: FaseDelResumen[] }

export type LecturaDelResumen = Resultado<ResumenDeLaCadena>

const esquemaDelConteo = z.object({ n: z.number().int().min(0), hay_mas: z.boolean() })

const esquemaDelResumen = z.object({
  fases: z.array(
    z.object({
      fase_id: z.guid().nullable(),
      nombre: z.string().nullable(),
      color: z.string().nullable(),
      orden: z.number().nullable(),
      activa: z.boolean().nullable(),
      es_final: z.boolean(),
      demora_dias: z.number().nullable(),
      vehiculos: esquemaDelConteo,
      demorados: esquemaDelConteo.nullable(),
      trabados: esquemaDelConteo.nullable(),
    }),
  ),
})

const comoConteo = (c: z.infer<typeof esquemaDelConteo>): ConteoAcotado => ({
  n: c.n,
  hayMas: c.hay_mas,
})

/** Lo que devolvió `logistica_cadena_resumen()`; `inesperado` si alguna fase no tiene la forma esperada. */
export function resumenDesde(datos: unknown): LecturaDelResumen {
  const leido = esquemaDelResumen.safeParse(datos)
  if (!leido.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({
    fases: leido.data.fases.map((f) => ({
      faseId: f.fase_id,
      nombre: f.nombre,
      color: f.color,
      orden: f.orden,
      activa: f.activa,
      esFinal: f.es_final,
      demoraDias: f.demora_dias,
      vehiculos: comoConteo(f.vehiculos),
      demorados: f.demorados === null ? null : comoConteo(f.demorados),
      trabados: f.trabados === null ? null : comoConteo(f.trabados),
    })),
  })
}

/** La cifra más alta de la cadena: contra ella se dibuja el largo de cada barra. */
export function maximoDeLaCadena(resumen: ResumenDeLaCadena): number {
  return resumen.fases.reduce((mayor, fase) => Math.max(mayor, fase.vehiculos.n), 0)
}

/** El largo de una barra, de 0 a 1, contra el máximo de la cadena. Una fase con vehículos nunca queda en 0 (se vería como vacía). */
export function proporcionDeLaBarra(n: number, maximo: number): number {
  if (maximo <= 0 || n <= 0) return 0
  return Math.min(1, Math.max(n / maximo, 0.02))
}

/** El largo de un tramo (demorados, trabados) dentro de la barra de su fase, de 0 a 1 de ESA barra. */
export function proporcionDelTramo(parte: number, total: number): number {
  if (total <= 0 || parte <= 0) return 0
  return Math.min(1, parte / total)
}

/** «12 demorados», «1 demorado», «1.000+ demorados»; nulo si no hay ninguno o la fase no alerta. */
export function textoDeDemorados(demorados: ConteoAcotado | null): string | null {
  if (demorados === null || (demorados.n === 0 && !demorados.hayMas)) return null
  if (!demorados.hayMas && demorados.n === 1) return '1 demorado'
  return `${conteoCorto(demorados)} demorados`
}

/** «3 trabados», «1 trabado», «3+ trabados»; nulo si no hay ninguno o la fase no alerta. */
export function textoDeTrabados(trabados: ConteoAcotado | null): string | null {
  if (trabados === null || (trabados.n === 0 && !trabados.hayMas)) return null
  if (!trabados.hayMas && trabados.n === 1) return '1 trabado'
  return `${conteoCorto(trabados)} trabados`
}

/** La cifra grande de una fase: «340», «1.000+». */
export function cifraDeLaFase(fase: Pick<FaseDelResumen, 'vehiculos'>): string {
  return conteoCorto(fase.vehiculos)
}

/** El nombre de una fase en la gráfica: el suyo, o «Sin fase». */
export function nombreDeLaFase(fase: Pick<FaseDelResumen, 'nombre'>): string {
  return fase.nombre ?? 'Sin fase'
}

/** Lo que dice el lector de pantalla de una fase: «Tránsito: 340 vehículos, 12 demorados, 3 trabados». */
export function etiquetaDeLaFase(fase: FaseDelResumen): string {
  const vehiculos =
    !fase.vehiculos.hayMas && fase.vehiculos.n === 1
      ? '1 vehículo'
      : `${conteoCorto(fase.vehiculos)} vehículos`
  const partes = [vehiculos, textoDeDemorados(fase.demorados), textoDeTrabados(fase.trabados)]
  return `${nombreDeLaFase(fase)}: ${partes.filter((p) => p !== null).join(', ')}`
}

/** ¿No hay ningún vehículo en la cadena? Entonces la gráfica lo dice con una línea. */
export function cadenaSinVehiculos(resumen: ResumenDeLaCadena): boolean {
  return resumen.fases.every((fase) => fase.vehiculos.n === 0 && !fase.vehiculos.hayMas)
}
