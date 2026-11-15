import 'server-only'
import { revalidatePath } from 'next/cache'
import { RUTAS } from '@/shared/lib/rutas'

// El vínculo y el interés se ven en la ficha del lead, en la del vehículo y en la unidad de logística (el bloque «Relacionados»): se vuelven a dibujar las
// tres (y el listado de vehículos, que sabe qué se puede enviar a la papelera).
export function revalidarVinculo(): void {
  revalidatePath(`${RUTAS.leads}/[id]`, 'page')
  revalidatePath(`${RUTAS.vehiculos}/[id]`, 'page')
  revalidatePath(`${RUTAS.logistica}/vehiculo/[id]`, 'page')
  revalidatePath(RUTAS.vehiculos)
}
