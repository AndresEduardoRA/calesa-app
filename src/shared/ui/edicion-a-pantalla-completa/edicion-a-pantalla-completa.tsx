'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buttonVariants } from '../button'
import { ConfirmarDescarte } from '../confirmar-descarte'
import { useSalidaConCambios } from '../use-salida-con-cambios'
import { ContextoDeLaEdicion, type Registro } from './contexto'
import { EstadoDeLaEdicionVisible } from './estado-de-la-edicion'

type Props = {
  // A dónde vuelve «‹ Salir»: la página de la pieza, sin el modo.
  salirA: Route
  // El título de la pieza («Planilla», «Hoja»): un texto fijo, que se ve desde el primer byte aunque lo demás espere. Es el `h1` de la pantalla.
  titulo: string
  // El camino (origen › fórmula › …): llega del servidor tras su `<Suspense>`.
  camino?: ReactNode
  children: ReactNode
}

// La edición a pantalla completa (docs/GLOSARIO.md): el editor ocupa toda la ventana. El marco de la app y el de Configuración se ocultan con CSS (`globals.css`,
// por la marca `data-edicion-a-pantalla-completa` de acá y la `data-oculto-al-editar` de cada marco): funciona desde el primer byte, sin parpadeo, y lo oculto sale del
// orden del Tab. Arriba, una barra propia: «‹ Salir», el camino, el título, el estado y a la derecha las acciones del editor (`<AccionesDeLaEdicion>`). Con cambios sin
// guardar, salir pregunta como siempre (`useSalidaConCambios()`); recargar no pregunta: lo editado sobrevive en la pestaña. Esc es del editor: acá no cierra nada.
// No sabe de cotizaciones ni de flujos.
export function EdicionAPantallaCompleta({ salirA, titulo, camino, children }: Props) {
  const [ranura, setRanura] = useState<HTMLElement | null>(null)
  const [registro, setRegistro] = useState<Registro | null>(null)
  const pregunta = useRef<HTMLDivElement>(null)
  const encabezado = useRef<HTMLHeadingElement>(null)
  const contexto = useMemo(() => ({ ranura, registrar: setRegistro }), [ranura])
  const { pendiente, seguir, descartar } = useSalidaConCambios(
    registro?.hayCambios ?? false,
    () => {
      registro?.alDescartar()
    },
    pregunta,
    { alRecargar: false },
  )
  // Al entrar, el lector de pantalla anuncia dónde está: el foco va al título.
  useEffect(() => {
    encabezado.current?.focus({ preventScroll: true })
  }, [])
  return (
    <ContextoDeLaEdicion value={contexto}>
      <div data-edicion-a-pantalla-completa="" className="grid min-w-0 content-start">
        <header
          data-barra-de-la-edicion=""
          className="sticky top-0 z-30 border-b border-(--color-line) bg-(--color-surface)"
        >
          <div className="flex min-h-(--barra-de-la-edicion) flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 md:px-6 md:py-0">
            <Link
              href={salirA}
              className={buttonVariants({
                variant: 'ghost',
                className: 'min-h-11 shrink-0 md:min-h-8',
              })}
            >
              <ChevronLeftIcon aria-hidden data-icon="inline-start" />
              Salir
            </Link>
            <span aria-hidden className="hidden h-5 w-px shrink-0 bg-(--color-line) md:block" />
            <div className="hidden min-w-0 md:block">{camino}</div>
            <h1
              ref={encabezado}
              tabIndex={-1}
              className="min-w-0 truncate text-(length:--text-lg) font-semibold text-(--color-ink) outline-none"
            >
              {titulo}
            </h1>
            <EstadoDeLaEdicionVisible estado={registro?.estado ?? null} />
            <div
              ref={setRanura}
              data-acciones-de-la-edicion=""
              className="ml-auto flex min-h-11 min-w-0 flex-wrap items-center justify-end gap-2 empty:hidden max-md:w-full md:min-h-9 max-md:[&>*:not(:has([aria-haspopup]))]:flex-1 max-md:[&>*:not(:has([aria-haspopup]))>*]:w-full"
            />
          </div>
          {pendiente ? (
            <div
              ref={pregunta}
              role="region"
              aria-label="Cambios sin guardar"
              className="border-t border-(--color-line) bg-(--color-surface) px-3 py-3 md:px-6"
            >
              <ConfirmarDescarte alSeguir={seguir} alDescartar={descartar} />
            </div>
          ) : null}
        </header>
        <div className="min-w-0 p-3 md:p-6">{children}</div>
      </div>
    </ContextoDeLaEdicion>
  )
}
