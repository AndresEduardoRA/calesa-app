import { z } from 'zod'
import { esquemaId } from '../../../entities/nodos'
import {
  LARGO_MAXIMO_DE_LA_ETIQUETA,
  LARGO_MAXIMO_DEL_NOMBRE,
  TOPE_DE_COLUMNAS,
} from '../../../entities/tablas/estructura'

// Lo que mandan «Nueva tabla», «Columnas» y «Desactivar» (docs/COTIZADOR.md › «Crear, columnas y desactivar»). La forma va aquí; las reglas con su campo
// (clave repetida, etiqueta repetida, tipo, en uso) las dice la base con su mensaje y su camino, y la pantalla las adelanta con `validarColumnas()`.
// El tipo es un texto: una columna nacida por SQL conserva el suyo y eso lo decide la base.
// Los largos cuentan letras como la base (`char_length`: un emoji es una), no unidades UTF-16 como `.max()`.
const hasta = (tope: number) => (texto: string) => [...texto].length <= tope

const esquemaDeColumna = z.object({
  clave: esquemaId,
  etiqueta: z.string().trim().min(1).refine(hasta(LARGO_MAXIMO_DE_LA_ETIQUETA)),
  tipo: z.string().min(1),
})

const esquemaDeColumnas = z.array(esquemaDeColumna).min(1).max(TOPE_DE_COLUMNAS)

export const esquemaDeCrearTabla = z.object({
  id: z.guid(),
  origenId: z.guid().nullable(),
  nombre: z.string().trim().min(1).refine(hasta(LARGO_MAXIMO_DEL_NOMBRE)),
  columnas: esquemaDeColumnas,
})

export const esquemaDeCambiarColumnas = z.object({
  tablaId: z.guid(),
  origenId: z.guid().nullable(),
  columnas: esquemaDeColumnas,
  versionEsperada: z.int().min(1),
})

export const esquemaDeDesactivarTabla = z.object({
  tablaId: z.guid(),
  origenId: z.guid().nullable(),
  versionEsperada: z.int().min(1),
})

export type EntradaDeCrearTabla = z.infer<typeof esquemaDeCrearTabla>
export type EntradaDeCambiarColumnas = z.infer<typeof esquemaDeCambiarColumnas>
export type EntradaDeDesactivarTabla = z.infer<typeof esquemaDeDesactivarTabla>
