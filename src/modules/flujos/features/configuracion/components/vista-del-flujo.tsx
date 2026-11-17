'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { TOPE_DE_FASES, type FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { useVistaDelFlujo } from '../hooks/use-vista-del-flujo'
import { DiagramaDelFlujoDiferido } from './diferidos'
import type { HuecosDelFlujo } from './huecos'
import { ListaDeFases } from './lista-de-fases'

type Props = {
  flujo: FlujoParaConfigurar
  nombreDelFlujo: string
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
  faseAbierta: string | null
  alAbrir: (faseId: string) => void
}

// Las fases del flujo: el diagrama (desde 768 px, si no se eligió la lista) o la lista; sin fases, el vacío (sin pedir el código del diagrama). Debajo, los
// avisos de lo que no se leyó entero.
export function VistaDelFlujo({
  flujo,
  nombreDelFlujo,
  roles,
  huecos,
  faseAbierta,
  alAbrir,
}: Props) {
  const { vista } = useVistaDelFlujo()
  return (
    <>
      {flujo.fases.length === 0 ? (
        <EstadoVacio compacto titulo={`El flujo de ${nombreDelFlujo} todavía no tiene fases.`} />
      ) : vista === 'diagrama' ? (
        <DiagramaDelFlujoDiferido
          flujo={flujo}
          roles={roles}
          huecos={huecos}
          faseAbierta={faseAbierta}
          alAbrir={alAbrir}
        />
      ) : (
        <ListaDeFases flujo={flujo} huecos={huecos} alAbrir={alAbrir} />
      )}
      {flujo.truncado.fases ? (
        <AvisoDeTope texto={`Mostrando las primeras ${String(TOPE_DE_FASES)} fases.`} />
      ) : null}
      {flujo.truncado.transiciones ? (
        <AvisoDeTope texto="Hay más salidas de las que se dibujan." />
      ) : null}
    </>
  )
}
