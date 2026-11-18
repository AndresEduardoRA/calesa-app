import type { CSSProperties } from 'react'
import { COLOR_TINTA } from '@/shared/config/app'
import { Marca } from '@/shared/ui/marca'
import { Monto } from '@/shared/ui/monto'
import { RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada } from '../../../entities/tarjeta/geometria-de-la-tarjeta'

const JUSTIFICAR = { arriba: 'flex-start', centro: 'center', abajo: 'flex-end' } as const
const ALINEAR = { izquierda: 'left', centro: 'center', derecha: 'right' } as const
const ALINEAR_LOGO = { izquierda: 'flex-start', centro: 'center', derecha: 'flex-end' } as const

// El rectángulo de la celda con su estilo: posiciones absolutas en px (la geometría ya las calculó), el fondo y el texto en hex (del catálogo o `auto`), el
// borde «negro» de la tarjeta (#1b2130) por lado y el relleno que completa 4 px con él. Son datos ya validados: van en línea.
function estiloDe(c: CeldaDibujada): CSSProperties {
  const { estilo: e, x, y, ancho, alto } = c
  const borde = (px: number) => `${String(px)}px solid ${COLOR_TINTA}`
  const relleno = (px: number) => Math.max(0, RELLENO_DE_LA_CELDA - px)
  return {
    position: 'absolute',
    left: x,
    top: y,
    width: ancho,
    height: alto,
    boxSizing: 'border-box',
    paddingTop: relleno(e.bordes.arriba),
    paddingRight: relleno(e.bordes.derecha),
    paddingBottom: relleno(e.bordes.abajo),
    paddingLeft: relleno(e.bordes.izquierda),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: JUSTIFICAR[e.alinearVertical],
    overflow: 'hidden',
    background: e.fondo,
    color: e.texto,
    fontSize: e.tamano,
    lineHeight: 1.4,
    fontWeight: e.negrita ? 600 : 400,
    fontStyle: e.cursiva ? 'italic' : 'normal',
    textAlign: ALINEAR[e.alinear],
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    borderTop: borde(e.bordes.arriba),
    borderRight: borde(e.bordes.derecha),
    borderBottom: borde(e.bordes.abajo),
    borderLeft: borde(e.bordes.izquierda),
  }
}

function Contenido({
  celda,
  logo,
}: {
  celda: CeldaDibujada
  logo: { nombre: string; url: string } | null
}) {
  const c = celda.contenido
  switch (c.tipo) {
    case 'texto':
      return c.lineas.length === 0 ? null : <span>{c.lineas.join('\n')}</span>
    case 'monto':
      return (
        <>
          <Monto valor={c.valor} moneda={c.moneda} />
          {c.segunda === null ? null : (
            <span data-total-bs-de-la-tarjeta="">
              <Monto valor={c.segunda.valor} moneda={c.segunda.moneda} />
            </span>
          )}
        </>
      )
    case 'logo':
      return logo === null ? null : (
        <span
          className="flex min-w-0"
          style={{ justifyContent: ALINEAR_LOGO[celda.estilo.alinear] }}
        >
          <Marca nombre={logo.nombre} logoUrl={logo.url} />
        </span>
      )
    case 'vacio':
      return null
  }
}

// Una celda de la tarjeta, con sus `data-*` para las pruebas (la fila, la columna, el nodo y qué muestra, la variable, el color y el total). Los montos van con
// `<Monto>`: el Modo Live los tapa.
export function CeldaDeLaTarjeta({
  celda,
  logo,
}: {
  celda: CeldaDibujada
  logo: { nombre: string; url: string } | null
}) {
  const m = celda.marca
  return (
    <div
      data-celda={celda.id}
      data-fila={celda.fila}
      data-columna={celda.columna}
      {...(m.nodo === undefined ? {} : { 'data-nodo': m.nodo, 'data-mostrar': m.mostrar })}
      {...(m.variable === undefined ? {} : { 'data-variable': m.variable })}
      {...(m.color === undefined ? {} : { 'data-color': m.color })}
      {...(m.total === true ? { 'data-total-usd': '' } : {})}
      style={estiloDe(celda)}
    >
      <Contenido celda={celda} logo={logo} />
    </div>
  )
}
