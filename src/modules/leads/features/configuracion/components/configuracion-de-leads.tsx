import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import type { OrigenDeLeadConUso } from '../../../entities/origen-de-lead'
import type { ListaDeTipos } from '../../../entities/tipo-de-lead'
import type { ListaDeTiposDeSeguimiento } from '../../../entities/tipo-de-seguimiento'
import { TarjetaDeOrigenes } from '../../origenes/components/tarjeta-de-origenes'
import { TarjetaDelEmbudo } from '../../plantillas/components/tarjeta-del-embudo'
import { TarjetaDelMensajeDelPortal } from '../../plantillas/components/tarjeta-del-mensaje-del-portal'
import { TarjetaDeTelefonosExtra } from '../../plantillas/components/tarjeta-de-telefonos-extra'
import { TarjetaDeTipos } from '../../tipos/components/tarjeta-de-tipos'
import { TarjetaDeSeguimientos } from '../../tipos-de-seguimiento/components/tarjeta-de-seguimientos'

type Props = {
  tipos: ListaDeTipos
  origenes: readonly OrigenDeLeadConUso[]
  seguimientos: ListaDeTiposDeSeguimiento
  ajustes: AjustesDeLeads
  // Los compone `src/app` (este módulo no depende de `empresa` ni de `web`), para el editor del mensaje del portal.
  empresa: string
  direccion: string | null
}

// Configuración › Leads (`/configuracion/leads`): seis tarjetas con lo guardado a la vista —tipos de lead, orígenes del lead, tipos de seguimiento, el
// embudo, el mensaje del portal y los teléfonos extra—; cada «Editar» abre su modal por `?panel=`, que se pide recién entonces. «Campos» sigue en su
// ruta. Entra quien tiene `leads.configurar` (la página lo exige). Sin `'use client'`: las tarjetas son las que lo traen.
export function ConfiguracionDeLeads({
  tipos,
  origenes,
  seguimientos,
  ajustes,
  empresa,
  direccion,
}: Props) {
  return (
    <TarjetasDeAjustes etiqueta="Configuración de los leads">
      <TarjetaDeTipos lista={tipos} />
      <TarjetaDeOrigenes origenes={origenes} />
      <TarjetaDeSeguimientos lista={seguimientos} />
      <TarjetaDelEmbudo embudo={ajustes.embudo} />
      <TarjetaDelMensajeDelPortal portal={ajustes.portal} empresa={empresa} direccion={direccion} />
      <TarjetaDeTelefonosExtra telefonos={ajustes.telefonos} />
    </TarjetasDeAjustes>
  )
}
