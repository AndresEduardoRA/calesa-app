// Lo que comparten las pestañas de las secciones de Configuración que todavía las tienen (Leads, Cotización, Flujos, Logística,
// Repuestos y Sitio web). Empresa ya no tiene pestañas: cada parte es una sub-ruta (`seccion.ts`). Vive aquí para no mover las
// importaciones de esas secciones.

// Una lista que nunca está vacía: `lista[0]` es un `T` y no hace falta un `!` ni un valor por defecto.
export type AlMenosUna<T> = readonly [T, ...T[]]

export function alMenosUna<T>(lista: readonly T[]): AlMenosUna<T> | null {
  const [primera, ...resto] = lista
  return primera === undefined ? null : [primera, ...resto]
}
