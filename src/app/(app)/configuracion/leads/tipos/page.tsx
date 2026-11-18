import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { TIPOS_DE_LEAD } from '../seccion'
import { SeccionTipos } from './seccion'

export const metadata: Metadata = { title: TIPOS_DE_LEAD.titulo }

// Configuración › Leads › Tipos de lead: los tipos de lead (`leads.configurar`). Cada panel tiene su URL (`?panel=`, `?tipo=`). Sin su permiso se ve apagada en el menú y esta URL abre
// la primera sub-sección que se puede abrir (`abrir.ts`).
export default async function PaginaTiposDeLead() {
  const { sinPermiso } = await abrirSubseccionDeLeads('tipos')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...TIPOS_DE_LEAD} />
      <SeccionTipos />
    </div>
  )
}
