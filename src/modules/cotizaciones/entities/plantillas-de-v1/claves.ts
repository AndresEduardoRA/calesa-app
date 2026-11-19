// Las claves y los nombres de las plantillas de V1, sin importar los paquetes: lo que el navegador puede conocer (el botón, el modal y el esquema de la
// action). Los paquetes viven en `index.ts`, que sólo importa el servidor (`solo-del-servidor.test.ts`). docs/COTIZADOR.md › «Plantillas de V1».
import { z } from 'zod'

export const CLAVES_DE_PLANTILLA_DE_V1 = ['usa', 'china', 'oficina', 'dealer'] as const
export type ClaveDePlantillaDeV1 = (typeof CLAVES_DE_PLANTILLA_DE_V1)[number]

export const esquemaDeClaveDePlantillaDeV1 = z.enum(CLAVES_DE_PLANTILLA_DE_V1)

export const NOMBRES_DE_PLANTILLA_DE_V1: Readonly<Record<ClaveDePlantillaDeV1, string>> = {
  usa: 'USA (subasta)',
  china: 'China',
  oficina: 'Oficina',
  dealer: 'Compra dealer USA',
}
