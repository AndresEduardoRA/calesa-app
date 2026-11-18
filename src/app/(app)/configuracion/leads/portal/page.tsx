import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { MENSAJE_DEL_PORTAL } from '../seccion'
import { SeccionMensajeDelPortal } from './seccion'

export const metadata: Metadata = { title: MENSAJE_DEL_PORTAL.titulo }

// Configuración › Leads › Mensaje del portal: el texto que se le pasa al cliente con su acceso al portal (`leads.configurar`). Sin su permiso se ve apagada en el menú y esta URL abre
// la primera sub-sección que se puede abrir (`abrir.ts`).
export default async function PaginaMensajeDelPortal() {
  const { sinPermiso } = await abrirSubseccionDeLeads('portal')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...MENSAJE_DEL_PORTAL} />
      <SeccionMensajeDelPortal />
    </div>
  )
}
