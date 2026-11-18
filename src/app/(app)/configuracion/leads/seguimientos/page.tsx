import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { TIPOS_DE_SEGUIMIENTO } from '../seccion'
import { SeccionTiposDeSeguimiento } from './seccion'

export const metadata: Metadata = { title: TIPOS_DE_SEGUIMIENTO.titulo }

// Configuración › Leads › Tipos de seguimiento: los tipos de seguimiento (`leads.configurar`). Cada panel tiene su URL (`?panel=`, `?tipo-de-seguimiento=`).
// Sin su permiso, a la primera sub-sección abierta (`abrir.ts`).
export default async function PaginaTiposDeSeguimiento() {
  const { sinPermiso } = await abrirSubseccionDeLeads('seguimientos')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...TIPOS_DE_SEGUIMIENTO} />
      <SeccionTiposDeSeguimiento />
    </div>
  )
}
