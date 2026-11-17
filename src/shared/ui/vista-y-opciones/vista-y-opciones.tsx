'use client'

import { Settings2Icon } from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from '../button'
import { useAbiertoAlgunaVez } from '../use-abierto-alguna-vez'
import { PanelDeVistaYOpcionesDiferido } from './diferidos'
import { resumenDe } from './grupos'
import type { GrupoDeVistaYOpciones } from './tipos'

const sinSuscripcion = () => () => undefined

type Props = {
  grupos: readonly GrupoDeVistaYOpciones[]
  // Avisa cuando el panel se abre o se cierra (`FilterShell` dibuja los avisos de «Ítems por página» bajo la barra sólo con el panel cerrado).
  alCambiarAbierto?: (abierto: boolean) => void
}

// «Vista y opciones» (`docs/GLOSARIO.md`): el botón de la barra de un listado que agrupa lo que no se usa a cada rato (vista, alcance, ítems
// por página, vistas guardadas, exportar, papelera). Dice lo activo («Lista · Míos · 25 por página»). Viaja en frío sólo el botón: el panel
// (popover desde 768 px, hoja inferior por debajo) se pide al abrirlo por primera vez (`diferido()`). Sin URL: es un menú; lo elegido adentro sí
// va a la URL. Sin grupos, nada.
export function VistaYOpciones({ grupos, alCambiarAbierto }: Props) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const montar = useAbiertoAlgunaVez(abierto)
  // Falso mientras la página llega del servidor, verdadero cuando React ya enganchó el botón: un clic anterior se perdería. Lo mira el e2e.
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const cambiar = useCallback(
    (valor: boolean) => {
      setAbierto(valor)
      alCambiarAbierto?.(valor)
    },
    [alCambiarAbierto],
  )
  // La pantalla se esconde (otra ruta; Next la conserva para volver) o se desmonta: el panel se cierra, así al volver no aparece abierto.
  const cerrarAlIrse = useEffectEvent(() => {
    cambiar(false)
  })
  useEffect(
    () => () => {
      cerrarAlIrse()
    },
    [],
  )
  if (grupos.length === 0) {
    return null
  }
  const resumen = resumenDe(grupos)
  return (
    <>
      <Button
        ref={boton}
        type="button"
        variant="outline"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        data-vista-y-opciones
        data-hidratado={hidratado}
        // Con el texto al 200 % crece en alto en vez de cortar el resumen o ensanchar la página.
        className="h-auto min-h-11 max-w-full py-1.5 text-left whitespace-normal md:min-h-9"
        onClick={() => {
          cambiar(!abierto)
        }}
      >
        <Settings2Icon aria-hidden />
        <span>
          Vista y opciones
          {resumen.map((texto) => (
            <Fragment key={texto}>
              {' '}
              <span aria-hidden className="text-(--color-ink-faint)">
                ·
              </span>{' '}
              <span className="font-normal text-(--color-ink-soft)">{texto}</span>
            </Fragment>
          ))}
        </span>
      </Button>
      {montar ? (
        <PanelDeVistaYOpcionesDiferido
          abierto={abierto}
          alCambiarAbierto={cambiar}
          boton={boton}
          grupos={grupos}
        />
      ) : null}
    </>
  )
}
