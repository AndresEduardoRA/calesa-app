import { z } from 'zod'

// Lo que cruza el límite del catálogo de colores (nombre técnico heredado: `tonos`): sólo la forma. El largo del nombre, el repetido y el hex los dice la base
// con el campo en el `hint`; las versiones de la hoja no viajan (la base las deriva del hex).
const hex = z.string().max(20)
const version = z.string().min(1)

export const esquemaCrearTono = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  nombre: z.string().max(200),
  hex,
})

// Sólo `nombre` y `hex` se cambian (la clave no): otra clave se rechaza aquí y en la base.
export const esquemaGuardarTono = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z.strictObject({ nombre: z.string().max(200).optional(), hex: hex.optional() }),
})

export const esquemaEliminarTono = z.object({ id: z.guid(), actualizadoEnEsperado: version })
