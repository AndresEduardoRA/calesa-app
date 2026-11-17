import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { CLASE_DE_OPCION } from '@/shared/ui/vista-y-opciones'

// A la papelera de vehículos, desde el grupo «Más» de «Vista y opciones» del inventario. Lo recibe quien puede abrirla.
export function EnlaceAPapelera() {
  return (
    <Link href={RUTAS.papeleraDeVehiculos as Route} className={CLASE_DE_OPCION}>
      <Trash2Icon aria-hidden />
      Papelera
    </Link>
  )
}
