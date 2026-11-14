// Lo que el núcleo de `logistica` necesita de afuera, dicho como interfaz. La implementación (Supabase) vive en `infra/nucleo/` y la une `areas/nucleo/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { UnidadLeida } from './leer-unidad'
import type { Unidad } from './unidad'

// La unidad de vehículo con ese id, leída con la sesión de quien mira. `null` si no existe, está en la papelera, la RLS no la deja ver o el id no es un guid.
export type LectorDeUnidad = (id: string) => Promise<Resultado<Unidad | null>>
// La misma lectura, con los atributos del vehículo (de ahí sale su identidad, 6.13).
export type LectorDeUnidadLeida = (id: string) => Promise<Resultado<UnidadLeida | null>>
// Los atributos de unos vehículos por su id, bajo la RLS de quien mira: lo que no ve no vuelve. De ahí sale el nombre de un vehículo (6.13).
export type LectorDeAtributos = (
  ids: readonly string[],
) => Promise<Resultado<Map<string, Record<string, unknown>>>>
