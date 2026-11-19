// Las plantillas de V1 (glosario: «Plantilla de V1»): cuatro paquetes fijos que replican un cotizador de V1 —la fórmula con su diseño de la hoja y la
// tarjeta en forma 2— y crean los borradores de un origen (`cotizacion_paquete_aplicar()`). Son datos del código, no de la base: cada JSON pasa por los
// validadores de verdad en `entities/plantilla/de-v1/*.test.ts` y en `supabase/tests/areas/formula/plantillas-de-v1.sql`, que los carga como juego.
// Sólo del servidor: el navegador conoce las claves (`claves.ts`) y los tipos (`tipos.ts`), nunca un paquete (`solo-del-servidor.test.ts`).
// docs/COTIZADOR.md › «Plantillas de V1».
import type { ClaveDePlantillaDeV1 } from './claves'
import type { PlantillaDeV1 } from './tipos'
import china from './china.json'
import dealer from './dealer.json'
import oficina from './oficina.json'
import usa from './usa.json'

// Un JSON importado se tipa con `string` donde la fórmula pide una unión de literales: el molde va una vez aquí y la forma la prueban los validadores.
const comoPaquete = (json: unknown) => json as PlantillaDeV1

// En el orden en que los ofrece el modal.
export const PLANTILLAS_DE_V1: readonly PlantillaDeV1[] = [usa, china, oficina, dealer].map(
  comoPaquete,
)

export function plantillaDeV1(clave: ClaveDePlantillaDeV1): PlantillaDeV1 {
  const p = PLANTILLAS_DE_V1.find((x) => x.clave === clave)
  if (p === undefined) throw new Error(`No hay plantilla de V1 «${clave}».`)
  return p
}
