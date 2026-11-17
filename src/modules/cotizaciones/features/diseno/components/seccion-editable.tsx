'use client'

import type { Tono } from '@/shared/ui/xcell'
import type { AnchoDeCelda, SeccionDeDiseno } from '../../../entities/diseno'
import { seccionAdmiteNivel, type NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { LugarDelRechazo } from '../../../entities/diseno/campo-del-rechazo'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { useFilaOrdenable } from '../hooks/use-fila-ordenable'
import { CamposDelAspectoDeLaSeccion, type ErrorDelAspecto, type TonoDelCatalogo } from './aspecto'
import { CamposDeLaSeccion } from './campos-de-la-seccion'
import { ItemDeLaSeccion } from './item-de-la-seccion'
import { ListaOrdenable, TituloConAsa } from './orden'

type Props = {
  seccion: SeccionDeDiseno
  nodos: NodosPorId
  etiquetas: ReadonlyMap<string, string>
  niveles: readonly NivelDelDiseno[]
  // Las tablas de referencia que nombra la fórmula, para la ayuda de una celda.
  tablas: readonly string[]
  // El catálogo de tonos (nulo si no se pudo leer) y sus colores, para el color de la sección.
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  ediciones: EdicionesDelDiseno
  ocupado: boolean
  // Un rechazo de forma del aspecto con su lugar: si es de esta sección o de uno de sus ítems, va bajo su select.
  rechazo: { mensaje: string; lugar: LugarDelRechazo | null } | null
  alPonerSeccion: (cambios: {
    titulo?: string
    presentacion?: SeccionDeDiseno['presentacion']
  }) => void
  alPonerAncho: (nodo: string, ancho: AnchoDeCelda) => void
  alPonerNiveles: (nodo: string | undefined, cambios: CambioDeNiveles) => void
}

const nombreDe = (etiquetas: ReadonlyMap<string, string>, nodo: string) =>
  etiquetas.get(nodo) ?? nodo

// Los ids de las filas de los ítems: tipo y nodo (un nodo repetido, que el aviso ya marca, lleva su número).
function idsDeLosItems(seccion: SeccionDeDiseno): string[] {
  const vistos = new Map<string, number>()
  return seccion.items.map((it) => {
    const id = `${it.tipo}:${it.nodo}`
    const n = vistos.get(id) ?? 0
    vistos.set(id, n + 1)
    return n === 0 ? id : `${id}#${String(n)}`
  })
}

function errorDelAspecto(
  rechazo: Props['rechazo'],
  seccionId: string,
  item?: { tipo: string; nodo: string },
): ErrorDelAspecto {
  const lugar = rechazo?.lugar
  if (!rechazo || !lugar || lugar.pieza === 'cabecera' || lugar.seccionId !== seccionId) return null
  if (item === undefined)
    return lugar.pieza === 'seccion' ? { clave: lugar.clave, mensaje: rechazo.mensaje } : null
  return lugar.pieza === 'item' && lugar.tipo === item.tipo && lugar.nodo === item.nodo
    ? { clave: lugar.clave, mensaje: rechazo.mensaje }
    : null
}

// Una sección: su asa (se ordena en la lista de secciones), su título, dónde va, quién la ve y quién la edita, su aspecto y sus ítems, que se ordenan dentro de
// ella: las celdas con su ancho, niveles y ayuda; los atajos y el interruptor con los suyos; la variante y el subtotal, de sólo lectura.
export function SeccionEditable(props: Props) {
  const {
    seccion,
    nodos,
    etiquetas,
    niveles,
    tablas,
    catalogo,
    colores,
    ediciones,
    ocupado,
    rechazo,
  } = props
  const { alMontar, estilo, asa } = useFilaOrdenable(seccion.id, ocupado)
  const ids = idsDeLosItems(seccion)
  const titulo = seccion.titulo ?? seccion.id
  return (
    <li
      ref={alMontar}
      style={estilo}
      className="@container min-w-0 rounded-(--radius-lg) border border-(--color-line-strong) bg-(--color-surface) p-3"
      data-seccion={seccion.id}
    >
      <TituloConAsa etiquetaDelAsa={`Mover la sección «${titulo}»`} asa={asa}>
        <p className="text-(length:--text-base) font-medium text-(--color-ink)">{`Sección «${titulo}»`}</p>
      </TituloConAsa>
      <CamposDeLaSeccion
        seccion={seccion}
        niveles={niveles}
        admite={seccionAdmiteNivel(seccion, nodos)}
        ocupado={ocupado}
        alPonerSeccion={props.alPonerSeccion}
        alPonerNiveles={(cambios) => {
          props.alPonerNiveles(undefined, cambios)
        }}
      />
      <div className="mt-3" data-aspecto-de-la-seccion="">
        <CamposDelAspectoDeLaSeccion
          seccion={seccion}
          catalogo={catalogo}
          colores={colores}
          ocupado={ocupado}
          error={errorDelAspecto(rechazo, seccion.id)}
          alPoner={(cambios) => {
            ediciones.ponerAspectoDeSeccion(seccion.id, cambios)
          }}
        />
      </div>
      <ListaOrdenable
        ids={ids}
        nombreDe={(id) => nombreDe(etiquetas, seccion.items[ids.indexOf(id)]?.nodo ?? id)}
        ocupado={ocupado}
        alMover={(desde, hasta) => {
          ediciones.moverItem(seccion.id, desde, hasta)
        }}
      >
        <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
          {seccion.items.map((item, k) => (
            <ItemDeLaSeccion
              key={ids[k]}
              idDeLaFila={ids[k] ?? `${item.tipo}:${item.nodo}`}
              seccion={seccion}
              item={item}
              etiqueta={nombreDe(etiquetas, item.nodo)}
              nodos={nodos}
              niveles={niveles}
              tablas={tablas}
              ediciones={ediciones}
              ocupado={ocupado}
              error={errorDelAspecto(rechazo, seccion.id, item)}
              alPonerAncho={props.alPonerAncho}
              alPonerNiveles={props.alPonerNiveles}
            />
          ))}
        </ul>
      </ListaOrdenable>
    </li>
  )
}
