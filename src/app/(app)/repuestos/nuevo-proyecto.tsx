'use client'

import { useNuevoProyectoPorUrl } from '@/modules/repuestos/pantallas/proyectos'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { NuevoProyectoAbiertoDiferido } from './diferidos'

// El vehículo de `?vehiculo=` y el lead de `?lead=` tal como los resolvió el servidor al cargar: su título si quien mira lo ve, nulo si no existe o no se ve (sin distinguirlos).
export type VehiculoDeLaUrl = { id: string; titulo: string | null }
export type LeadResueltoDeLaUrl = { id: string; titulo: string | null }

type Props = {
  puedeEditar: boolean
  puedeVerLeads: boolean
  puedeCrearLeads: boolean
  vehiculoDeLaUrl: VehiculoDeLaUrl | null
  leadDeLaUrl: LeadResueltoDeLaUrl | null
}

const AVISO_DEL_VEHICULO = 'No encontramos ese vehículo o no tienes acceso.'

// «Nuevo proyecto»: la URL y lo que el servidor resolvió de ella. El formulario con todo lo que cruza módulos se pide con `diferido()` la primera vez que se abre. Un
// `?vehiculo=` que el servidor resolvió abre el formulario ya vinculado; uno inválido, o que no se ve, lo abre como «Externo» con un aviso, nunca con un error. El `?lead=`
// (el que dejó «Nuevo lead», o un enlace) lo elige el formulario cuando coincide con lo resuelto.
export function NuevoProyecto({
  puedeEditar,
  puedeVerLeads,
  puedeCrearLeads,
  vehiculoDeLaUrl,
  leadDeLaUrl,
}: Props) {
  const panel = useNuevoProyectoPorUrl(puedeEditar)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  if (!montado) {
    return null
  }
  const pedido = panel.vehiculoEnLaUrl
  const resuelto =
    vehiculoDeLaUrl !== null && vehiculoDeLaUrl.id === pedido ? vehiculoDeLaUrl : null
  const vehiculoInicial =
    resuelto !== null && resuelto.titulo !== null
      ? { id: resuelto.id, titulo: resuelto.titulo }
      : null
  return (
    <NuevoProyectoAbiertoDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      apertura={panel.apertura}
      vehiculoInicial={vehiculoInicial}
      avisoDelVehiculo={pedido !== null && vehiculoInicial === null ? AVISO_DEL_VEHICULO : null}
      puedeVerLeads={puedeVerLeads}
      puedeCrearLeads={puedeCrearLeads}
      dejarDebajo={panel.dejarDebajo}
      leadDelAlta={{
        enLaUrl: panel.leadEnLaUrl,
        resuelto: leadDeLaUrl !== null && leadDeLaUrl.id === panel.leadEnLaUrl ? leadDeLaUrl : null,
        soltar: panel.soltarLead,
      }}
    />
  )
}
