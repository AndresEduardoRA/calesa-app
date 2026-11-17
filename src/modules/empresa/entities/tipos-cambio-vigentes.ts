// Los tipos de cambio vigentes del popover de la barra superior, con el último cambio de su valor (`tipos_cambio_vigentes()`), y lo que el
// popover dice cuando otra persona guardó antes (PT409): quién, a cuánto y cuándo, armado acá y no por la base, porque el monto va por
// <Monto> (el Modo Live lo oculta).
import { z } from 'zod'

// Cuántos se dibujan en el popover: la lectura pide uno de más y, si lo hay, el popover lo dice con <AvisoDeTope>.
export const TOPE_DEL_POPOVER = 30

// Cuándo y quién cambió el valor por última vez (del historial: renombrar o marcar no lo mueve). `por` es el nombre, nunca el correo; null
// si fue el sistema o la persona no tiene nombre.
export type UltimoCambio = { en: string; por: string | null }

export type TipoCambioVigente = {
  id: string
  nombre: string
  monedaDe: string
  monedaA: string
  valor: number
  // ISO, como lo da la base: la versión que manda quien edita.
  actualizadoEn: string
  // Quién tocó la fila por última vez (por cualquier cambio), o null.
  actualizadoPor: string | null
  ultimoCambio: UltimoCambio | null
}

// La fila de `tipos_cambio_vigentes()`. Los nombres y el último cambio pueden faltar aunque el tipo generado diga `string`.
export const esquemaDeTipoCambioVigente = z.object({
  id: z.guid(),
  nombre: z.string(),
  moneda_de: z.string(),
  moneda_a: z.string(),
  valor: z.number(),
  actualizado_en: z.string().min(1),
  actualizado_por: z.string().nullable(),
  valor_cambiado_en: z.string().nullable(),
  valor_cambiado_por: z.string().nullable(),
})

type FilaVigente = z.infer<typeof esquemaDeTipoCambioVigente>

export function vigentesDesde(filas: readonly FilaVigente[]): TipoCambioVigente[] {
  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    monedaDe: fila.moneda_de,
    monedaA: fila.moneda_a,
    valor: fila.valor,
    actualizadoEn: fila.actualizado_en,
    actualizadoPor: fila.actualizado_por,
    ultimoCambio: fila.valor_cambiado_en
      ? { en: fila.valor_cambiado_en, por: fila.valor_cambiado_por }
      : null,
  }))
}

// Lo que pasó con un tipo de cambio que se intentó guardar y dio PT409, mirado sobre lo que se releyó:
// - `valor`: otra persona cambió el valor (a cuánto, quién y cuándo, del último cambio);
// - `otro`: el valor es el mismo, pero otra persona tocó otra cosa de la fila (el nombre, «En la barra»…);
// - `ya_no_esta`: ya no está activo (o no existe).
export type ConflictoDeValor =
  | { tipo: 'valor'; quien: string | null; valor: number; moneda: string; cuando: string | null }
  | { tipo: 'otro'; quien: string | null; cuando: string }
  | { tipo: 'ya_no_esta' }

export function conflictoDeValor(
  enPantalla: { id: string; valor: number },
  vigentes: readonly TipoCambioVigente[],
): ConflictoDeValor {
  const fresco = vigentes.find((uno) => uno.id === enPantalla.id)
  if (!fresco) {
    return { tipo: 'ya_no_esta' }
  }
  if (fresco.valor !== enPantalla.valor) {
    return {
      tipo: 'valor',
      quien: fresco.ultimoCambio?.por ?? null,
      valor: fresco.valor,
      moneda: fresco.monedaA,
      cuando: fresco.ultimoCambio?.en ?? null,
    }
  }
  return { tipo: 'otro', quien: fresco.actualizadoPor, cuando: fresco.actualizadoEn }
}
