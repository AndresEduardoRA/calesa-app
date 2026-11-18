import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { redirigir } from '@/shared/lib/navegacion'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: 'Origen' }

// `/configuracion/origenes/<id>` sin parte abre «Datos», y los enlaces de antes (`?seccion=`, `?campo=`, `?categoria=`, `?panel=`) su
// sub-ruta con lo que traían (`url-vieja.ts`). Cada parte comprueba sola el permiso y el 404.
export default async function PaginaOrigen({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]'>) {
  const [{ id }, parametros] = await Promise.all([params, searchParams])
  if (!z.guid().safeParse(id).success) {
    notFound()
  }
  redirigir(destinoDeLaUrlVieja(id, parametros))
}
