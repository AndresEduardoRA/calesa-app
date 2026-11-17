import { connection } from 'next/server'
import { leerUnidad } from '@/modules/logistica'
import { DocumentosDeLaUnidad } from '@/modules/logistica/pantallas/documentos-unidad'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'

// El bloque «Documentos»: el mismo componente del hueco del panel de la unidad (D2). La unidad se lee en el servidor (la lista necesita su fase para saber qué pide la fase siguiente;
// `leerUnidad` lleva `cache()`: una lectura por pedido con la del bloque de la fase); la lista de documentos, desde el navegador al montarse (el bloque espera a acercarse). Una unidad
// que no existe o que quien mira no ve se dice, no deja el bloque en blanco.
export async function BloqueDocumentos({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const unidad = datosO(await leerUnidad(vehiculoId))
  if (!unidad) {
    return <EstadoVacio compacto titulo="Esta unidad ya no está disponible." />
  }
  return <DocumentosDeLaUnidad key={unidad.id} unidad={unidad} />
}
