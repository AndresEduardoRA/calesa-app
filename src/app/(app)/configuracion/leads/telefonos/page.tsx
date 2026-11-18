import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { TELEFONOS_EXTRA } from '../seccion'
import { SeccionTelefonosExtra } from './seccion'

export const metadata: Metadata = { title: TELEFONOS_EXTRA.titulo }

// Configuración › Leads › Teléfonos extra: el máximo de teléfonos extra y si cuentan como el principal (`leads.configurar`).
// Sin su permiso, a la primera sub-sección abierta (`abrir.ts`).
export default async function PaginaTelefonosExtra() {
  const { sinPermiso } = await abrirSubseccionDeLeads('telefonos')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...TELEFONOS_EXTRA} />
      <SeccionTelefonosExtra />
    </div>
  )
}
