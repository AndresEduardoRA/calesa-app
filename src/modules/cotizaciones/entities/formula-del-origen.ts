// La fórmula del origen (docs/GLOSARIO.md): una fórmula con nombre de un origen, con su borrador, sus versiones, su diseño y su plantilla de tarjeta. Un origen
// tiene hasta 50 y a lo sumo una activa, la que se cotiza. La «fórmula de trabajo» es la que lee y escribe Configuración: la activa o, si no hay, la más nueva sin
// archivar (espejo de `_fdo_de_trabajo()`). Puro: las filas las trae `infra/` y las reglas las vuelve a decidir la base (docs/COTIZADOR.md › «Fórmulas del origen»).
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

// Espejo del tope de `formula_del_origen_crear()` (las archivadas no cuentan).
export const TOPE_DE_FORMULAS_DEL_ORIGEN = 50

// Espejo del check de `formulas_del_origen.nombre` (`char_length` entre 1 y 60, sin espacios en los bordes).
export const LARGO_DEL_NOMBRE = 60

// Los textos que la base devuelve, para quien los muestre sin pasar por ella (#407).
export const MENSAJES_DE_LA_FORMULA_DEL_ORIGEN = {
  largo: `El nombre lleva de 1 a ${String(LARGO_DEL_NOMBRE)} caracteres.`,
  repetido: (nombre: string) => `Ya hay una fórmula «${nombre}» en este origen.`,
  tope: `Este origen ya tiene ${String(TOPE_DE_FORMULAS_DEL_ORIGEN)} fórmulas: archiva o elimina alguna.`,
  archivada: 'Esta fórmula está archivada.',
  activaNoSeArchiva: 'La fórmula activa no se archiva ni se elimina: activa otra primero.',
} as const

export const esquemaDeLaFormulaDelOrigen = z.strictObject({
  id: z.guid(),
  nombre: z
    .string()
    .min(1)
    .max(LARGO_DEL_NOMBRE * 2),
  activa: z.boolean(),
  actualizado_en: z.string().min(1),
})

// La fórmula de trabajo de un origen, como la usan las lecturas de Configuración: su id (lo que mandan las escrituras), el nombre y la hora (la esperada de
// renombrar, archivar o activar), tal cual el texto de la base.
export type FormulaDelOrigen = {
  id: string
  nombre: string
  activa: boolean
  actualizadoEn: string
}

export function formulaDelOrigenDesde(
  fila: z.infer<typeof esquemaDeLaFormulaDelOrigen>,
): FormulaDelOrigen {
  return {
    id: fila.id,
    nombre: fila.nombre,
    activa: fila.activa,
    actualizadoEn: fila.actualizado_en,
  }
}

// El nombre como lo guarda la base: sin espacios en los bordes y de 1 a 60 caracteres contados como `char_length` (por punto de código: un emoji es uno).
export function nombreDeLaFormula(texto: string): Resultado<string> {
  const nombre = texto.trim()
  const largo = [...nombre].length
  return largo >= 1 && largo <= LARGO_DEL_NOMBRE
    ? ok(nombre)
    : fallo('validacion', MENSAJES_DE_LA_FORMULA_DEL_ORIGEN.largo)
}
