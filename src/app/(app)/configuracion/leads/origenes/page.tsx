import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { ORIGENES_DE_LEADS } from '../seccion'
import { SeccionOrigenes } from './seccion'

export const metadata: Metadata = { title: ORIGENES_DE_LEADS.titulo }

// Configuración › Leads › Orígenes del lead: los orígenes del lead (`leads.configurar`). Cada panel tiene su URL (`?panel=`, `?origen=`). Sin su permiso se ve apagada en el menú y esta URL abre
// la primera sub-sección que se puede abrir (`abrir.ts`).
export default async function PaginaOrigenesDeLeads() {
  const { sinPermiso } = await abrirSubseccionDeLeads('origenes')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...ORIGENES_DE_LEADS} />
      <SeccionOrigenes />
    </div>
  )
}
