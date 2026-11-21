// Lo que manda el modal «Empezar desde una plantilla» a la action: la fórmula del origen, la clave del paquete y las versiones de los borradores que leyó, nunca una fórmula (el
// servidor la toma del código). docs/COTIZADOR.md › «Plantillas de V1».
import { z } from 'zod'
import { esquemaDeClaveDePlantillaDeV1 } from '../../../entities/plantillas-de-v1/claves'

// La versión como el texto de la base, con sus microsegundos (un `Date` los pierde).
const esquemaDeHora = z.iso.datetime({ offset: true })

export const esquemaDeAplicarPlantillaDeV1 = z.object({
  origenId: z.guid(),
  // La fórmula del origen que se edita (la de la URL): el paquete escribe sus borradores.
  formulaDelOrigenId: z.guid(),
  plantilla: esquemaDeClaveDePlantillaDeV1,
  formulaEsperada: esquemaDeHora.nullable(),
  plantillaEsperada: esquemaDeHora.nullable(),
})
export type EntradaDeAplicarPlantillaDeV1 = z.infer<typeof esquemaDeAplicarPlantillaDeV1>
