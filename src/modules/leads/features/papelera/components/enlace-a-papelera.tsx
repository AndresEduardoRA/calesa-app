import { Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { CLASE_DE_OPCION } from '@/shared/ui/vista-y-opciones'

// A la papelera de leads, desde el grupo «Más» de «Vista y opciones» del listado. Lo recibe quien puede abrirla.
export function EnlaceAPapeleraDeLeads() {
  return (
    <Link href={RUTAS.papeleraDeLeads as Route} className={CLASE_DE_OPCION}>
      <Trash2Icon aria-hidden />
      Papelera
    </Link>
  )
}
