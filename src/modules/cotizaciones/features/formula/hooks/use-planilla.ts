'use client'

import { useCallback, useId, useMemo, useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { Nodo } from '../../../entities/nodos'
import { contextoDeDondeSale, deDondeSale } from '../../../entities/formula/de-donde-sale'
import { opcionesDeBucket } from '../../../entities/formula/grupos'
import { bandasDeLaPlanilla } from '../../../entities/formula/planilla'
import { totalesDeLaUnidad } from '../../../entities/formula/totales-de-la-planilla'
import {
  modoDelMotor,
  UNIDAD_EN_CEROS,
  type UnidadDeEjemplo,
} from '../../../entities/formula/unidad-de-ejemplo'
import type { AccionesDeLaUnidad } from '../components/planilla/celda-de-la-unidad'
import type { ContextoDeLasBandas } from '../components/planilla/banda-de-la-planilla'
import {
  motivoDeEspera,
  type ContextoDeLasFilas,
} from '../components/planilla/contexto-de-las-filas'
import type { PropsDeLaPlanilla } from '../components/planilla/tipos'
import {
  candidatasDe,
  miembrosPorGrupo,
  SIN_CANDIDATAS,
} from '../components/editor/miembros-de-los-grupos'
import { filasVisibles } from './use-editor-de-la-formula.soporte'
import { useTonos } from './use-tonos'
import { useUnidadDeLaPlanilla } from './use-unidad-de-la-planilla'

const enCeros = (u: UnidadDeEjemplo) =>
  u === UNIDAD_EN_CEROS ||
  (Object.keys(u.inputs).length === 0 &&
    Object.keys(u.banderas).length === 0 &&
    Object.keys(u.vehiculo).length === 0 &&
    u.variante === undefined)

// Cambiar la unidad de ejemplo: estable (el `set` de la sesión), para las filas `memo`.
function useAccionesDeLaUnidad(cambiar: PropsDeLaPlanilla['alCambiarUnidad']): AccionesDeLaUnidad {
  return useMemo(
    () => ({
      alCambiarInput: (id, valor) => {
        cambiar((u) => ({ ...u, inputs: { ...u.inputs, [id]: valor } }))
      },
      alCambiarBandera: (id, valor) => {
        cambiar((u) => ({ ...u, banderas: { ...u.banderas, [id]: valor } }))
      },
      alCambiarCampo: (campo, valor) => {
        cambiar((u) => ({ ...u, vehiculo: { ...u.vehiculo, [campo]: valor } }))
      },
      alElegirVariante: (clave) => {
        cambiar((u) => ({ ...u, variante: clave }))
      },
    }),
    [cambiar],
  )
}

// El cálculo con la unidad de ejemplo y el modo elegido, «de dónde sale» de cada fila (una vez por fórmula de trabajo) y las líneas de «Totales».
function useCalculoDeLaPlanilla(p: PropsDeLaPlanilla) {
  const { editor } = p
  const { locale } = useRegional()
  const modos = useMemo(() => p.diseno?.cabecera.modos ?? [], [p.diseno])
  const delModo = modos.find((m) => m.clave === p.modo)
  const modo = useMemo(() => (delModo === undefined ? undefined : modoDelMotor(delModo)), [delModo])
  const { vista, cifras } = useUnidadDeLaPlanilla({
    validada: editor.validada,
    filas: editor.filas,
    lectura: editor.lectura,
    unidad: p.unidad,
    modo,
  })
  const dicho = useMemo(() => contextoDeDondeSale(editor.trabajo, locale), [editor.trabajo, locale])
  const dichas = useMemo(
    () => new Map(editor.filas.map((f) => [f.id, deDondeSale(f.nodo, dicho)])),
    [editor.filas, dicho],
  )
  const lineas = useMemo(
    () =>
      vista?.tipo === 'calculada' && editor.validada !== null
        ? totalesDeLaUnidad(editor.validada, vista, modo, dicho)
        : [],
    [vista, editor.validada, modo, dicho],
  )
  return { modos, delModo, vista, cifras, dicho, dichas, lineas }
}

// Las filas que se dibujan (búsqueda y tope; la de la barra y la de «Sumar fila debajo», siempre) en sus bandas, y el número de cada una.
function useBandas(
  editor: PropsDeLaPlanilla['editor'],
  busqueda: string,
  deLaBarra: string | null,
) {
  const forzada = editor.nueva.sumando?.tras ?? deLaBarra
  const visibles = useMemo(
    () => filasVisibles(editor.filas, busqueda, forzada),
    [editor.filas, busqueda, forzada],
  )
  const ids = useMemo(() => new Set(visibles.filas.map((f) => f.id)), [visibles.filas])
  const buscando = busqueda.trim() !== ''
  const bandas = useMemo(
    () =>
      bandasDeLaPlanilla(editor.trabajo, editor.filas, {
        visibles: ids,
        conGruposVacios: !buscando,
      }),
    [editor.trabajo, editor.filas, ids, buscando],
  )
  const numeros = useMemo(
    () =>
      new Map(
        bandas.flatMap((b) =>
          b.tipo === 'variante' ? [] : b.filas.map((f) => [f.fila.id, f.numero] as const),
        ),
      ),
    [bandas],
  )
  return { visibles, bandas, numeros }
}

// Qué fila se elige para la barra de fórmula: con texto sin aplicar, la elegida no cambia y la barra lo dice (y recibe el foco).
function useEleccion(editor: PropsDeLaPlanilla['editor'], nodos: ReadonlyMap<string, Nodo>) {
  const [elegida, setElegida] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enfocar, setEnfocar] = useState(0)
  const { abierta } = editor
  const { soltarLaCreada } = editor.nueva
  const alElegir = useCallback(
    (id: string) => {
      if (abierta !== null && abierta.id !== id) {
        const etiqueta = nodos.get(abierta.id)?.etiqueta ?? abierta.id
        setAviso(`Aplica o descarta el cambio de «${etiqueta}» antes de elegir otra fila.`)
        setEnfocar((n) => n + 1)
        return
      }
      setAviso(null)
      soltarLaCreada()
      setElegida(id)
    },
    [abierta, nodos, soltarLaCreada],
  )
  const deLaBarra = abierta?.id ?? editor.nueva.creada ?? elegida
  return { deLaBarra, alElegir, aviso: abierta === null ? null : aviso, enfocar }
}

type Calculo = ReturnType<typeof useCalculoDeLaPlanilla>

// Lo de las bandas que no es de una fila: los grupos (su formulario y sus colores), el permiso de los tipos de cambio y la unidad de ejemplo.
function useDeLasBandas(p: PropsDeLaPlanilla, c: Calculo): ContextoDeLasBandas {
  const { editor } = p
  const tonos = useTonos()
  const hayGrupoAbierto = editor.grupos.abierto !== null
  const miembros = useMemo(() => miembrosPorGrupo(editor.trabajo), [editor.trabajo])
  const candidatas = useMemo(
    () => (hayGrupoAbierto ? candidatasDe(editor.trabajo) : SIN_CANDIDATAS),
    [hayGrupoAbierto, editor.trabajo],
  )
  const buckets = useMemo(() => opcionesDeBucket(editor.trabajo), [editor.trabajo])
  const deOmision = editor.trabajo.definicion.buckets ?? {}
  return {
    tonos: tonos.estado,
    alReintentarTonos: tonos.reintentar,
    buckets,
    conModos: c.modos.length > 0,
    miembros,
    candidatas,
    tipoDeCambioDe: (bucket) => {
      const id =
        c.delModo === undefined
          ? Object.hasOwn(deOmision, bucket)
            ? deOmision[bucket]
            : undefined
          : c.delModo.buckets.find((b) => b.bucket === bucket)?.nodo
      return id === undefined ? bucket : (c.dicho.nodos.get(id)?.etiqueta ?? id)
    },
    puedeCambiarTiposDeCambio: p.puedeCambiarTiposDeCambio,
    enCeros: enCeros(p.unidad),
    alVolverACeros: () => {
      p.alCambiarUnidad(UNIDAD_EN_CEROS)
    },
  }
}

// Lo que dibuja la planilla de la fórmula, armado sobre la fórmula de trabajo de la sesión: las bandas, «de dónde sale», el cálculo de la unidad, «Totales» y la fila
// elegida para la barra de fórmula.
export function usePlanilla(p: PropsDeLaPlanilla) {
  const { editor } = p
  const idDelMotivo = useId()
  const [busqueda, setBusqueda] = useState('')
  const c = useCalculoDeLaPlanilla(p)
  const nodos = c.dicho.nodos
  const eleccion = useEleccion(editor, nodos)
  const { visibles, bandas, numeros } = useBandas(editor, busqueda, eleccion.deLaBarra)
  const acciones = useAccionesDeLaUnidad(p.alCambiarUnidad)
  const deLasBandas = useDeLasBandas(p, c)
  const motivo = motivoDeEspera(editor)
  const ctx: ContextoDeLasFilas = {
    editor,
    nodos,
    elegida: eleccion.deLaBarra,
    cifras: c.cifras,
    dichas: c.dichas,
    vista: c.vista,
    unidad: p.unidad,
    motivo,
    idDelMotivo,
    alElegir: eleccion.alElegir,
    acciones,
  }
  const cabecera = p.diseno?.cabecera
  return {
    busqueda,
    setBusqueda,
    visibles,
    bandas,
    ctx,
    deLasBandas,
    vista: c.vista,
    lineas: c.lineas,
    modos: c.modos,
    verTotalBs: (cabecera?.ver_total_bs ?? false) && (cabecera?.ver_total_bs_por_defecto ?? false),
    barra: barraDe(editor, eleccion, { numeros, dichas: c.dichas, motivo }),
  }
}

// Lo que la barra de fórmula muestra de la fila elegida.
function barraDe(
  editor: PropsDeLaPlanilla['editor'],
  eleccion: ReturnType<typeof useEleccion>,
  de: {
    numeros: ReadonlyMap<string, number>
    dichas: ReadonlyMap<string, string>
    motivo: string | null
  },
) {
  const { deLaBarra } = eleccion
  const fila = deLaBarra === null ? null : (editor.filas.find((f) => f.id === deLaBarra) ?? null)
  const id = fila?.id ?? ''
  return {
    fila,
    numero: de.numeros.get(id) ?? null,
    abierta: editor.abierta?.id === id ? editor.abierta : null,
    motivo: de.motivo,
    aviso: eleccion.aviso,
    enfocar: eleccion.enfocar,
    deDondeSale: de.dichas.get(id) ?? '',
    soltados: editor.aplicada?.id === id ? editor.aplicada.soltados : [],
  }
}
