'use client'

import { useLayoutEffect, useState, type ComponentType } from 'react'
import { modoInicial } from '../../../../entities/cabecera-de-la-hoja'
import type { CatalogoDeTablas } from '../../../../entities/compilador'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import {
  UNIDAD_EN_CEROS,
  type UnidadDeEjemplo,
} from '../../../../entities/formula/unidad-de-ejemplo'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../../entities/tarjeta-en-vivo'
import { useEditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import { useLecturaDeLaDefinicion } from '../../hooks/use-lectura-de-la-definicion'
import { EditorDeLaFormula } from '../editor/editor-de-la-formula'
import { PlanillaDiferida } from '../planilla/diferidos'
import { ListaDeFilasDiferida } from './diferidos'
import { EstadoDeLaLectura } from './estado-de-la-lectura'

export type PropsDeLaSesion = {
  origen: { id: string; nombre: string }
  // La versión que se edita: la del borrador o, sin él, la publicada.
  formulaId: string
  // «Sobre el borrador de <persona>.» o «Sobre la versión N publicada.»
  sobre: string
  // El Modo avanzado (`?panel=editar-formula`): el editor en texto. Si no, la planilla.
  avanzado: boolean
  alAbrirAvanzado: () => void
  // «Volver a la planilla»: cierra el Modo avanzado.
  alVolver: () => void
  // Tras un conflicto al guardar: trae la pestaña de nuevo y vuelve a montar la sesión sobre lo que haya.
  recargando: boolean
  alRecargar: () => void
  // Hay cambios aplicados sin guardar: «Publicar…» espera (se publica lo guardado).
  alCambiarPendientes: (hay: boolean) => void
  // La tarjeta en vivo de la planilla: la lectura del servidor y el dibujo del área `tarjeta` (este módulo no la importa).
  tarjeta: LecturaDeLaTarjetaEnVivo
  // El catálogo de tablas del origen, con el que se compila BUSCARV; null si no se pudo leer.
  tablas: CatalogoDeTablas
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  puedeCambiarTiposDeCambio: boolean
}

// Con la versión leída: la fórmula de trabajo, una sola para los dos modos, y la unidad de ejemplo y el modo elegido de la planilla (sobreviven al ir y volver del
// Modo avanzado; recargar vuelve a ceros).
function SesionLista({ leida, ...p }: PropsDeLaSesion & { leida: FormulaParaEditar }) {
  const editor = useEditorDeLaFormula({ origenId: p.origen.id, leida, tablas: p.tablas })
  const [unidad, setUnidad] = useState<UnidadDeEjemplo>(UNIDAD_EN_CEROS)
  const cabecera = leida.diseno?.cabecera
  const [modo, setModo] = useState(() =>
    modoInicial({
      modos: cabecera?.modos ?? [],
      modoPorDefecto: cabecera?.modo_por_defecto ?? null,
    }),
  )
  const hayCambios = editor.guardado.hayCambios
  const { alCambiarPendientes } = p
  // Registro hijo → padre en `useLayoutEffect`: el padre dibuja «Publicar…» con lo de ahora, también tras hidratar.
  useLayoutEffect(() => {
    alCambiarPendientes(hayCambios)
  }, [hayCambios, alCambiarPendientes])
  useLayoutEffect(
    () => () => {
      alCambiarPendientes(false)
    },
    [alCambiarPendientes],
  )
  if (p.avanzado) {
    return (
      <EditorDeLaFormula nombreDelOrigen={p.origen.nombre} sobre={p.sobre} alVolver={p.alVolver}>
        <ListaDeFilasDiferida
          editor={editor}
          nombreDelOrigen={p.origen.nombre}
          diseno={leida.diseno}
          recargando={p.recargando}
          alRecargar={p.alRecargar}
        />
      </EditorDeLaFormula>
    )
  }
  return (
    <PlanillaDiferida
      editor={editor}
      diseno={leida.diseno}
      origen={p.origen}
      sobre={p.sobre}
      unidad={unidad}
      alCambiarUnidad={setUnidad}
      modo={modo}
      alElegirModo={setModo}
      alAbrirAvanzado={p.alAbrirAvanzado}
      recargando={p.recargando}
      alRecargar={p.alRecargar}
      tarjeta={p.tarjeta}
      TarjetaEnVivo={p.TarjetaEnVivo}
      puedeCambiarTiposDeCambio={p.puedeCambiarTiposDeCambio}
    />
  )
}

// La sesión de edición de la fórmula de un origen: lee la versión desde el navegador al montarse y tiene **la** fórmula de trabajo (`useEditorDeLaFormula`, una sola
// vez): la planilla y el Modo avanzado la comparten, así que lo aplicado en uno se ve en el otro sin reponer nada. Lo aplicado vive en la pestaña hasta «Guardar el
// borrador» (4.21-3b-1). Lee la versión con la que abrió y no otra (C8): guardar sobre la publicada crea el borrador y la pestaña cambia de versión, pero la sesión
// sigue sobre lo suyo; sólo «Recargar» la vuelve a montar.
export function SesionDeLaFormula(props: PropsDeLaSesion) {
  const [formulaId] = useState(props.formulaId)
  const { estado, reintentar } = useLecturaDeLaDefinicion(formulaId)
  if (estado.tipo === 'lista') return <SesionLista {...props} leida={estado.leida} />
  const cuerpo = (
    <EstadoDeLaLectura
      estado={estado}
      nombreDelOrigen={props.origen.nombre}
      alReintentar={reintentar}
    />
  )
  return props.avanzado ? (
    <EditorDeLaFormula
      nombreDelOrigen={props.origen.nombre}
      sobre={props.sobre}
      alVolver={props.alVolver}
    >
      {cuerpo}
    </EditorDeLaFormula>
  ) : (
    <section aria-label="Planilla de la fórmula" className="grid min-w-0 gap-3">
      {cuerpo}
    </section>
  )
}
