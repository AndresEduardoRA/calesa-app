'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { cn } from 'cn'
import { Button } from '../button'
import type { PorPaginaDelListado } from './use-por-pagina-del-listado'

const sinSuscripcion = () => () => undefined

const FLECHAS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

type Props = {
  opciones: readonly number[]
  estado: PorPaginaDelListado
  // La etiqueta queda para el lector de pantalla (y `getByLabel`): dentro de «Vista y opciones» el título visible es el de la sección.
  etiquetaOculta?: boolean
  className?: string
}

export type PorPaginaDeLaLista = { valor: number; opciones: readonly number[] }

// «Ítems por página»: el mismo texto y el mismo control en todo listado. Es un `<select>` nativo (en el celular abre el
// selector del sistema). Con el mouse o el dedo cambia al elegir; con las flechas del teclado, en cambio, recorre los
// tamaños sin ir al servidor cada vez: se confirma con Enter o al salir del campo, y Esc lo deja como estaba.
export function SelectorDePorPagina({
  opciones,
  estado,
  etiquetaOculta = false,
  className,
}: Props) {
  const [tecleado, setTecleado] = useState<number | null>(null)
  const conFlecha = useRef(false)
  // Falso mientras la página llega del servidor, verdadero cuando React ya enganchó el control: un cambio anterior se
  // perdería. Lo mira el e2e (`data-hidratado`); a quien usa la pantalla no le cambia nada.
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const confirmar = () => {
    if (tecleado !== null) {
      const elegido = tecleado
      setTecleado(null)
      estado.elegir(elegido)
    }
  }
  return (
    <div className={cn('grid justify-items-end gap-1', className)}>
      <label className="flex items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className={etiquetaOculta ? 'sr-only' : 'whitespace-nowrap'}>Ítems por página</span>
        <select
          data-hidratado={hidratado}
          value={String(tecleado ?? estado.visto)}
          className="h-11 min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) tabular-nums outline-none focus-visible:shadow-(--shadow-focus) md:h-9 md:text-(length:--text-sm)"
          onKeyDown={(evento) => {
            if (FLECHAS.has(evento.key)) {
              conFlecha.current = true
            } else if (evento.key === 'Enter' && tecleado !== null) {
              evento.preventDefault()
              confirmar()
            } else if (evento.key === 'Escape' && tecleado !== null) {
              // El primer Esc deshace el tamaño a medio elegir con flechas y no cierra el panel que lo contiene («Vista y opciones»): no
              // llega al popup ni a `document`, donde escucha Base UI. El segundo, sí.
              evento.stopPropagation()
              evento.nativeEvent.stopImmediatePropagation()
              setTecleado(null)
            }
          }}
          onKeyUp={() => {
            conFlecha.current = false
          }}
          onChange={(evento) => {
            const tamano = Number(evento.target.value)
            // Un tamaño que el selector no ofrece (un `<option>` agregado desde las herramientas del navegador) no se guarda ni se
            // aplica: la página volvería con el tamaño de siempre y `usePorPaginaDelListado` seguiría mostrando el elegido (5a-15).
            if (!opciones.includes(tamano)) {
              evento.target.value = String(tecleado ?? estado.visto)
              return
            }
            if (conFlecha.current) {
              setTecleado(tamano)
            } else {
              estado.elegir(tamano)
            }
          }}
          onBlur={confirmar}
        >
          {opciones.map((tamano) => (
            <option key={tamano} value={tamano}>
              {tamano}
            </option>
          ))}
        </select>
      </label>
      <AvisosDePorPagina estado={estado} />
    </div>
  )
}

// Lo que dice «Ítems por página» cuando no pudo aplicar o guardar el tamaño: va con el selector y, con «Vista y opciones» cerrado, bajo la barra.
export function AvisosDePorPagina({ estado }: { estado: PorPaginaDelListado }) {
  if (!estado.esperandoRed && !estado.sinGuardar) {
    return null
  }
  return (
    <>
      {estado.esperandoRed ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin conexión: se aplicará cuando vuelva la red.
        </p>
      ) : null}
      {estado.sinGuardar ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
        >
          No se pudo guardar tu preferencia: esta página igual muestra {estado.visto}.
          <Button variant="ghost" className="h-11 md:h-8" onClick={estado.reintentarGuardado}>
            Reintentar
          </Button>
        </p>
      ) : null}
    </>
  )
}
