import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirSubseccionDeLeads } from '../abrir'
import { PLANTILLA_DEL_EMBUDO } from '../seccion'
import { SeccionEmbudo } from './seccion'

export const metadata: Metadata = { title: PLANTILLA_DEL_EMBUDO.titulo }

// Configuración › Leads › Plantilla del embudo: las etapas con que nace un embudo (`leads.configurar`). Sin su permiso se ve apagada en el menú y esta URL abre
// la primera sub-sección que se puede abrir (`abrir.ts`).
export default async function PaginaPlantillaDelEmbudo() {
  const { sinPermiso } = await abrirSubseccionDeLeads('embudo')
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <EncabezadoDeConfiguracion {...PLANTILLA_DEL_EMBUDO} />
      <SeccionEmbudo />
    </div>
  )
}
