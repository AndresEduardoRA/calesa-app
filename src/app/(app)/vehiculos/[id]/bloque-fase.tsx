import { connection } from 'next/server'
import { leerUnidad } from '@/modules/logistica'
import { QueFaltaDeLaFicha } from '@/modules/logistica/pantallas/mover-ficha'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'

// Lo de adentro del bloque «Fase y qué falta»: la unidad se lee en el servidor (`leerUnidad` lleva `cache()`: la misma lectura que el bloque
// «Documentos») y «Qué falta», de sólo lectura, lee lo suyo desde el navegador al montarse. La situación ya está en la cabecera: acá no se repite.
export async function BloqueFase({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const unidad = datosO(await leerUnidad(vehiculoId))
  if (!unidad) {
    return <EstadoVacio compacto titulo="Esta unidad ya no está disponible." />
  }
  return <QueFaltaDeLaFicha key={unidad.id} unidad={unidad} />
}
