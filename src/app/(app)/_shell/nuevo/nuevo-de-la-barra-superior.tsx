'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { adelantarElAlta, useAbrirNuevoLead } from '@/modules/leads/shell.client'
import { useAtajo } from '@/shared/ui/atajos'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CATALOGO_DE_NUEVO, type ClaveDeNuevo } from './catalogo'
import { adelantarElModalDeNuevo, ModalDeNuevoDiferido } from './diferidos'

// El valor de `?panel=` que abre «Nuevo». Distinto de `nuevo` (el alta de un vehículo) y de `nuevo-lead`.
export const PANEL_NUEVO_DE_LA_BARRA = 'crear'

// Lo que corre después de cerrar el modal: Base UI le devuelve el foco a quien lo abrió al cerrar; el drawer que se abre después espera a que lo haya hecho
// para que su foco no lo pise (igual que la paleta).
const DESPUES_DE_CERRAR_MS = 0

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
// siendo lo propio de la pantalla (o «Nuevo lead»): lo registra `<AltaDeLead>`.
export function NuevoDeLaBarraSuperior({ opciones }: Props) {
  const router = useRouter()
  const abrirNuevoLead = useAbrirNuevoLead()
  const panel = usePanelPorUrl(PANEL_NUEVO_DE_LA_BARRA)
  // Elegido algo, el modal se va al instante aunque la pantalla de destino tarde en llegar.
  const [elegido, setElegido] = useState(false)
  if (!panel.abierto && elegido) {
    setElegido(false)
  }
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [recienAbierto, setRecienAbierto] = useState(false)
  const unica = opciones.length === 1 ? CATALOGO_DE_NUEVO[opciones[0] as ClaveDeNuevo] : null

  const ir = (clave: ClaveDeNuevo) => {
    const destino = CATALOGO_DE_NUEVO[clave].destino
    if (destino.tipo === 'ruta') {
      router.push(destino.ruta as Route)
    } else if (destino.tipo === 'drawer-de-lead') {
      setTimeout(abrirNuevoLead, DESPUES_DE_CERRAR_MS)
    }
  }

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
    panel.abrir()
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
          opciones={opciones}
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
