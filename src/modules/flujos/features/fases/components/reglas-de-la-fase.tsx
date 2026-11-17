'use client'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { reglasQueAfectanALaFase, textoDeLaRegla } from '../../../entities/fases/reglas-de-la-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { usePanelDelFlujo } from '../../configuracion/hooks/use-panel-del-flujo'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `bloques.reglas`: «Reglas que la afectan», las reglas del flujo que dejan (o no) encender un interruptor de la fase, cada una con su estado en
// texto y color. «Cambiar las reglas del flujo» abre las reglas en el mismo panel (si esta persona las ve).
export function ReglasDeLaFase({ flujo, fase }: Props) {
  const panel = usePanelDelFlujo()
  const reglas = reglasQueAfectanALaFase(flujo, fase)
  return (
    <div className="grid min-w-0 gap-3 text-(length:--text-sm)">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {reglas.map((regla) => (
          <li key={regla.regla} className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
            <Badge variant={regla.activa ? 'secondary' : 'outline'}>
              {regla.activa ? 'Encendida' : 'Apagada'}
            </Badge>
            <span className="min-w-0 flex-1 text-(--color-ink)">{textoDeLaRegla(regla)}</span>
          </li>
        ))}
      </ul>
      {panel.disponibles.includes('reglas') ? (
        <Button
          variant="outline"
          className="min-h-11 justify-self-start md:min-h-8"
          onClick={() => {
            panel.abrirSeccion('reglas')
          }}
        >
          Cambiar las reglas del flujo
        </Button>
      ) : null}
    </div>
  )
}
