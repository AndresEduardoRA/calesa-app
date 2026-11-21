'use client'

import { CopyIcon, PlusIcon, WorkflowIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_COPIAR_FASES } from '../../../entities/fases/copiar-fases'
import { PANEL_NUEVA_FASE } from '../../../entities/fases/panel-de-fase'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useFlujosParaCopiar } from '../../configuracion/hooks/use-flujos-para-copiar'

type Props = { flujo: FlujoParaConfigurar; nombreDelFlujo: string }

// Los dos botones van en una fila si caben y, si no (columna angosta o texto al 200 %), uno debajo del otro a todo el ancho; el texto envuelve antes
// que ensanchar la página.
const CLASE_DEL_BOTON = 'h-auto min-h-11 max-w-full grow whitespace-normal md:min-h-8'

// El hueco `sinFases`: el vacío de un flujo sin fases con las dos maneras de empezarlo. «Empezar con las fases de…» abre `?panel=copiar-fases` y
// «Empezar en blanco», `?panel=nueva-fase`; los dos modales los monta `AccionesDeLaLista` (en la barra, que sigue montada cuando el flujo se llena).
// Sin otro origen con fases de donde copiar, sólo «Nueva fase».
export function EmpezarElFlujo({ nombreDelFlujo }: Props) {
  const desde = useFlujosParaCopiar()
  const copiar = usePanelPorUrl(PANEL_COPIAR_FASES)
  const nueva = usePanelPorUrl(PANEL_NUEVA_FASE)
  const conCopia = desde.length > 0
  const titulo = `El flujo de ${nombreDelFlujo} todavía no tiene fases.`

  return (
    <EstadoVacio
      compacto
      Icono={WorkflowIcon}
      titulo={titulo}
      descripcion={
        conCopia
          ? 'Cópialo de otro origen y ajústalo, o arma las fases una por una.'
          : 'Arma las fases una por una.'
      }
      accion={
        <div className="flex w-full max-w-lg flex-wrap justify-center gap-2">
          {conCopia ? (
            <Button
              className={CLASE_DEL_BOTON}
              onClick={() => {
                copiar.abrir()
              }}
            >
              <CopyIcon aria-hidden />
              Empezar con las fases de…
            </Button>
          ) : null}
          <Button
            className={CLASE_DEL_BOTON}
            variant={conCopia ? 'outline' : 'default'}
            onClick={() => {
              nueva.abrir()
            }}
          >
            <PlusIcon aria-hidden />
            {conCopia ? 'Empezar en blanco' : 'Nueva fase'}
          </Button>
        </div>
      }
    />
  )
}
