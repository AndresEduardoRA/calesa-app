'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { Tono } from '@/shared/ui/xcell'
import { MuestraDeTono } from '../muestra-de-tono'
import { AUTOMATICO, SIN_CATALOGO } from './etiquetas-del-aspecto'

export type TonoDelCatalogo = { clave: string; nombre: string }

type Props = {
  nombre: string
  valor: string | undefined
  // El catálogo de la empresa; nulo si no se pudo leer (el color no se elige).
  catalogo: readonly TonoDelCatalogo[] | null
  // Los colores del catálogo, para la muestra.
  colores: readonly Tono[]
  ocupado: boolean
  error?: string | undefined
  alCambiar: (tono: string | null) => void
}

// «Sin color», los tonos del catálogo por nombre y, si el diseño nombra uno que el catálogo no tiene (o no se leyó), ese también para poder cambiarlo.
function opcionesDeTono(valor: string | undefined, catalogo: readonly TonoDelCatalogo[] | null) {
  const conocido = catalogo?.some((t) => t.clave === valor) ?? false
  return [
    { valor: AUTOMATICO, etiqueta: 'Sin color' },
    ...(catalogo ?? []).map((t) => ({ valor: t.clave, etiqueta: t.nombre })),
    ...(valor === undefined || conocido
      ? []
      : [{ valor, etiqueta: `${valor} (no está en el catálogo)` }]),
  ]
}

// El color de una sección o de la cabecera: un tono del catálogo (nunca un hex). Uno que el diseño nombra y el catálogo ya no tiene se muestra para cambiarlo.
export function SelectorDeTono({
  nombre,
  valor,
  catalogo,
  colores,
  ocupado,
  error,
  alCambiar,
}: Props) {
  const opciones = opcionesDeTono(valor, catalogo)
  const muestra = colores.find((t) => t.clave === valor)
  const ayuda = catalogo === null ? SIN_CATALOGO : undefined
  return (
    <div className="grid min-w-0 gap-1.5">
      <CampoSeleccion
        nombre={nombre}
        etiqueta="Color"
        opciones={opciones}
        value={valor ?? AUTOMATICO}
        disabled={ocupado || catalogo === null}
        {...(ayuda === undefined ? {} : { ayuda })}
        {...(error === undefined ? {} : { error })}
        onChange={(evento) => {
          const v = evento.target.value
          alCambiar(v === AUTOMATICO ? null : v)
        }}
      />
      {muestra === undefined ? null : <MuestraDeTono tema="claro" colores={muestra.claro} />}
    </div>
  )
}
