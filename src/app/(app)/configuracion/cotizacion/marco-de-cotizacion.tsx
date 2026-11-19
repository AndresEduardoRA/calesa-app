import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { PestanasDeCotizacion } from './pestanas-de-cotizacion'
import { SelectorDeOrigen, type OrigenDelSelector } from './selector-de-origen'

const TOPE_DEL_ANCHO = { angosto: 'max-w-3xl', ancho: 'max-w-6xl', completo: '' } as const

type Props = {
  // La parte que se ve: su título y su frase salen del registro (`seccion.ts`).
  parte: { clave: string; titulo: string; descripcion: string }
  // Las pestañas que la persona ve, con su ruta resuelta.
  pestanas: readonly { clave: string; titulo: string; ruta: string; motivo?: string }[]
  // Con los dos, el selector de origen (las páginas por origen).
  origenes?: readonly OrigenDelSelector[]
  origenAbierto?: string
  // `ancho`: la hoja, que lleva su vista previa al costado desde `xl`; `completo` (sin tope): la tarjeta, cuyo lienzo es la vista previa y lleva el panel a la derecha.
  ancho?: 'angosto' | 'ancho' | 'completo'
  children: ReactNode
}

// Lo común a las páginas de Configuración › Cotización, en este orden: «‹ Cotización» (vuelve al inicio, como «‹ Orígenes»), los chips de
// origen (sólo por origen), las pestañas, el título con su frase y el contenido. No importa ningún módulo: cada página trae su pantalla.
export function MarcoDeCotizacion({
  parte,
  pestanas,
  origenes,
  origenAbierto,
  ancho = 'angosto',
  children,
}: Props) {
  return (
    <div className={`grid min-w-0 gap-4 ${TOPE_DEL_ANCHO[ancho]}`}>
      <Link
        href={RUTAS.configuracionDeCotizacion}
        className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-(--radius-md) pr-2 pl-1 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-8"
      >
        <ChevronLeftIcon aria-hidden className="size-4 shrink-0" />
        Cotización
      </Link>
      {origenes && origenAbierto ? (
        <SelectorDeOrigen origenes={origenes} abierto={origenAbierto} />
      ) : null}
      <PestanasDeCotizacion pestanas={pestanas} valor={parte.clave} />
      <EncabezadoDeConfiguracion titulo={parte.titulo} descripcion={parte.descripcion} />
      {children}
    </div>
  )
}
