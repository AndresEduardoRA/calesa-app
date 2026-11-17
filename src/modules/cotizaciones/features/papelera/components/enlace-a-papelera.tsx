import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { Permisos } from '@/shared/lib/permisos'
import { CLASE_DE_OPCION } from '@/shared/ui/vista-y-opciones'
import { puedeAbrirLaPapeleraDeCotizaciones } from '../../../entities/papelera/acceso'
import { RUTA_DE_LA_PAPELERA_DE_COTIZACIONES } from '../../../entities/papelera/ruta'

// A la papelera de cotizaciones, desde el grupo «Más» de «Vista y opciones» del listado. Sólo lo dibuja quien puede abrirla (P2 a). Es un Server Component: `/cotizaciones` no paga JS por él.
export function EnlaceAPapeleraDeCotizaciones({ permisos }: { permisos: Permisos }) {
  if (!puedeAbrirLaPapeleraDeCotizaciones(permisos)) {
    return null
  }
  return (
    <Link href={RUTA_DE_LA_PAPELERA_DE_COTIZACIONES as Route} className={CLASE_DE_OPCION}>
      <Trash2Icon aria-hidden />
      Papelera
    </Link>
  )
}
