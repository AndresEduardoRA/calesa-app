'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { adelantarElAlta } from '@/modules/leads/shell.client'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CATALOGO_DE_NUEVO, delGrupo, type ClaveDeNuevo, type GrupoDeNuevo } from './catalogo'
import { adelantarElModalDeNuevo, ModalDeNuevoDiferido } from './diferidos'
import { PANEL_NUEVO_DE_LA_BARRA, PANEL_NUEVO_EN_LA_AGENDA } from './panel'
import { useIrAlDestino } from './use-ir-al-destino'

export { PANEL_NUEVO_DE_LA_BARRA } from './panel'

// Otro diálogo ya abierto (un panel, la paleta, un formulario): la tecla no abre «Nuevo» encima, y no pisa lo escrito.
// Un doble clic en el botón: el segundo clic cae sobre el fondo del modal que acaba de abrir y lo cerraría. En el primer instante el clic de afuera no cierra.
const GRACIA_DEL_DOBLE_CLIC_MS = 350

const hayUnDialogoAbierto = () => document.querySelector('[role="dialog"][data-open]') !== null

type Props = {
  // Lo que quien mira puede crear, ya calculado en el servidor (`opciones.ts`): sólo claves.
  opciones: readonly ClaveDeNuevo[]
}

// «Nuevo (barra superior)»: el botón de la barra de toda pantalla y la tecla `Shift+N` que abren el modal con lo que se puede crear (`docs/UX.md` › «Barra superior»).
// El modal vive en la URL (`?panel=crear`: recargar lo reabre, «atrás» lo cierra) y se pide al abrirse. Con una sola opción el botón la abre directo, sin modal. `N` sigue
// siendo lo propio de la pantalla (o «Nuevo lead»): lo registra `<AltaDeLead>`. El mismo modal, filtrado a lo que se agenda, lo abre «Nuevo» de la agenda
// (`?panel=nuevo-en-la-agenda`): evento y tarea ahí sólo escriben su `?panel=` y conservan la vista y la fecha.
export function NuevoDeLaBarraSuperior({ opciones }: Props) {
  const router = useRouter()
  const ir = useIrAlDestino()
  const general = usePanelPorUrl(PANEL_NUEVO_DE_LA_BARRA)
  const deLaAgenda = usePanelPorUrl(PANEL_NUEVO_EN_LA_AGENDA)
  const panel = deLaAgenda.abierto ? deLaAgenda : general
  // El grupo con que se abrió: se conserva mientras el modal se va, para que la lista no cambie en el cierre.
  const [grupo, setGrupo] = useState<GrupoDeNuevo>(null)
  const grupoAbierto: GrupoDeNuevo = deLaAgenda.abierto ? 'agenda' : null
  if (panel.abierto && grupo !== grupoAbierto) {
    setGrupo(grupoAbierto)
  }
  // Elegido algo, el modal se va al instante aunque la pantalla de destino tarde en llegar.
  const [elegido, setElegido] = useState(false)
  if (!panel.abierto && elegido) {
    setElegido(false)
  }
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [recienAbierto, setRecienAbierto] = useState(false)
  const unica = opciones.length === 1 ? CATALOGO_DE_NUEVO[opciones[0] as ClaveDeNuevo] : null

  const abrir = () => {
    if (unica && unica.destino.tipo !== 'elegir-lead') {
      ir(unica.clave)
      return
    }
    adelantarElModalDeNuevo()
    setRecienAbierto(true)
    setTimeout(() => {
      setRecienAbierto(false)
    }, GRACIA_DEL_DOBLE_CLIC_MS)
    general.abrir()
  }
  useAtajo('abrirNuevo', () => {
    if (!panel.abierto && !hayUnDialogoAbierto()) {
      abrir()
    }
  })

  return (
    <>
      <Button
        size="sm"
        aria-label="Nuevo"
        aria-haspopup={unica ? undefined : 'dialog'}
        aria-keyshortcuts="Shift+N"
        className="max-md:h-[44px] max-md:min-w-[44px]"
        onClick={abrir}
        onPointerEnter={adelantarElModalDeNuevo}
        onFocus={adelantarElModalDeNuevo}
      >
        <PlusIcon aria-hidden />
        <span className="hidden @min-[24rem]:inline">Nuevo</span>
      </Button>
      {montado ? (
        <ModalDeNuevoDiferido
          abierto={panel.abierto && !elegido}
          alCerrar={panel.cerrar}
          recienAbierto={recienAbierto}
          opciones={delGrupo(opciones, grupo)}
          grupo={grupo}
          alElegir={(clave) => {
            setElegido(true)
            ir(clave)
          }}
          alAdelantar={(clave) => {
            if (clave === 'lead') {
              adelantarElAlta()
            }
          }}
          alIrA={(ruta) => {
            setElegido(true)
            router.push(ruta as Route)
          }}
        />
      ) : null}
    </>
  )
}
