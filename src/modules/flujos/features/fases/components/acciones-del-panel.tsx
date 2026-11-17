'use client'

import { ArrowLeftIcon, ArrowRightIcon, ArchiveIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  useFocoTrasMover,
  type Movimiento,
} from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  despuesDeAlMover,
  motivoSinMover,
  type DireccionDeFase,
} from '../../../entities/fases/orden-de-fases'
import { firmaDelOrdenDeFases } from '../../../entities/fases/panel-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import {
  MOTIVO_SIN_ORDEN_AQUI,
  useOrdenDeFases,
} from '../../configuracion/hooks/use-orden-de-fases'
import { useAbrirEliminarFase } from '../hooks/use-eliminar-fase-por-url'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

const PREFIJO = 'fase-del-panel'
const BOTON = 'min-h-11 md:min-h-8'

// El hueco `bloques.acciones`, arriba del panel de una fase: «Mover antes» y «Mover después» (ordenar con el teclado; el foco sigue en el botón cuando llega
// el orden nuevo) y, en una activa, «Jubilar o eliminar» (la confirmación por URL que monta la barra). Apagados, con el motivo en texto. Una jubilada se
// reactiva desde «Datos».
export function AccionesDelPanel({ flujo, fase }: Props) {
  const orden = useOrdenDeFases()
  const abrirQuitar = useAbrirEliminarFase()
  const idDelMotivo = useId()
  const [movimiento, setMovimiento] = useState<(Movimiento & { firmaAntes: string }) | null>(null)
  const firma = firmaDelOrdenDeFases(flujo.fases)
  useFocoTrasMover(PREFIJO, movimiento && firma !== movimiento.firmaAntes ? movimiento : null)
  const general = orden === null ? MOTIVO_SIN_ORDEN_AQUI : orden.motivo
  const motivoDe = (direccion: DireccionDeFase) =>
    general ?? motivoSinMover(flujo.fases, fase.id, direccion)
  const motivos = [...new Set([motivoDe('subir'), motivoDe('bajar')].filter((m) => m !== null))]

  async function mover(direccion: DireccionDeFase) {
    const destino = despuesDeAlMover(flujo.fases, fase.id, direccion)
    if (destino === null || orden === null) {
      return
    }
    const firmaAntes = firma
    if (await orden.mover(fase.id, destino.despuesDe)) {
      setMovimiento((antes) => ({
        id: fase.id,
        direccion,
        veces: (antes?.veces ?? 0) + 1,
        firmaAntes,
      }))
    }
  }

  const boton = (direccion: DireccionDeFase, texto: string, Icono: typeof ArrowLeftIcon) => {
    const motivo = motivoDe(direccion)
    return (
      <Button
        id={`${PREFIJO}-${fase.id}-${direccion}`}
        variant="outline"
        className={BOTON}
        // Apagado por motivo; en curso sólo no responde (si se apagara, el foco se iría del botón).
        disabled={motivo !== null}
        aria-describedby={motivo === null ? undefined : idDelMotivo}
        onClick={() => {
          if (!orden?.enCurso) void mover(direccion)
        }}
      >
        <Icono aria-hidden />
        {texto}
      </Button>
    )
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-2">
        {boton('subir', 'Mover antes', ArrowLeftIcon)}
        {boton('bajar', 'Mover después', ArrowRightIcon)}
        {fase.activa ? (
          <Button
            variant="outline"
            className={BOTON}
            onClick={() => {
              abrirQuitar(fase.id)
            }}
          >
            <ArchiveIcon aria-hidden />
            Jubilar o eliminar
          </Button>
        ) : null}
      </div>
      {motivos.length > 0 ? (
        <p id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivos.join(' ')}
        </p>
      ) : null}
    </div>
  )
}
