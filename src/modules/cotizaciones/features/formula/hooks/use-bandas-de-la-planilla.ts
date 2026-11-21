'use client'

import { useMemo } from 'react'
import { avisar } from '@/shared/ui/toasts'
import type { Formula } from '../../../entities/formula'
import { crearBanda, quitarBanda } from '../../../entities/formula/bandas'
import { opcionesDeTipoDeCambio } from '../../../entities/formula/buckets'
import {
  aplicarGrupo,
  type CambiosDelGrupo,
  type ContextoDelGrupo,
  type ErrorDelGrupo,
} from '../../../entities/formula/grupos'
import {
  cambiarTotal,
  type CambiosDelTotal,
  type ErrorDelTotal,
} from '../../../entities/formula/total-de-la-formula'
import type { NombradoPorLaTarjeta } from '../../../entities/tarjeta-en-vivo'
import {
  candidatasDe,
  miembrosPorGrupo,
} from '../components/planilla/comunes/miembros-de-los-grupos'
import { useDeshacer } from './use-deshacer'
import type { EditorDeLaFormula } from './use-editor-de-la-formula'
import { ESPERA_A_LA_FILA } from './use-guardar-borrador.soporte'
import { useTonos } from './use-tonos'

type Args = {
  editor: EditorDeLaFormula
  // El diseño tiene modos de tipo de cambio: no se crean buckets (D14).
  conModos: boolean
  // Lo que nombra la tarjeta de trabajo (nulo si no se leyó: no se quita ninguna banda).
  tarjeta: NombradoPorLaTarjeta | null
}

const ESPERA: ErrorDelGrupo[] = [{ campo: 'grupo', mensaje: ESPERA_A_LA_FILA }]

// Las bandas de la planilla (D13 y D14): crear (con el tipo de cambio del total si la fórmula no lo tiene: el de la banda), editar (etiqueta, color, plazo, tipo de
// cambio y filas), quitar (sus filas quedan sin banda, con «Deshacer») y el total y los tipos de cambio. Los errores de un panel vuelven por campo; nada cambia.
export function useBandasDeLaPlanilla({ editor, conModos, tarjeta }: Args) {
  const { trabajo, cambiar, libre } = editor
  const tonos = useTonos()
  const conDeshacer = useDeshacer(editor)
  const tiposDeCambio = useMemo(
    () => opcionesDeTipoDeCambio(trabajo, { conModos }),
    [trabajo, conModos],
  )
  const miembros = useMemo(() => miembrosPorGrupo(trabajo), [trabajo])
  const candidatas = useMemo(() => candidatasDe(trabajo), [trabajo])
  const entrar = (r: { ok: true; formula: Formula } | { ok: false; errores: ErrorDelGrupo[] }) => {
    if (!r.ok) return r.errores
    return cambiar(r.formula) ? null : ESPERA
  }
  return {
    tonos,
    tiposDeCambio,
    conModos,
    miembros,
    candidatas,
    crear: (cambios: CambiosDelGrupo, contexto: ContextoDelGrupo): ErrorDelGrupo[] | null =>
      libre
        ? entrar(
            crearBanda(
              trabajo,
              { ...cambios, totalEn: trabajo.definicion.total_en ?? cambios.tipoDeCambio },
              contexto,
            ),
          )
        : ESPERA,
    editar: (grupoId: string, cambios: CambiosDelGrupo, contexto: ContextoDelGrupo) =>
      libre ? entrar(aplicarGrupo(trabajo, grupoId, cambios, contexto)) : ESPERA,
    // Por qué no se quita (para apagar «Quitar banda»), o nulo.
    motivoParaQuitar: (grupoId: string): string | null => {
      const r = quitarBanda(trabajo, grupoId, { tarjeta, conModos })
      return r.ok ? null : r.mensaje
    },
    quitar: (grupoId: string) => {
      const r = quitarBanda(trabajo, grupoId, { tarjeta, conModos })
      const etiqueta = trabajo.definicion.grupos?.find((g) => g.id === grupoId)?.etiqueta ?? ''
      if (!libre) avisar(ESPERA_A_LA_FILA)
      else if (!r.ok) avisar(r.mensaje)
      else conDeshacer(r.formula, `Se quitó la banda «${etiqueta}».`)
    },
    cambiarTotal: (cambios: CambiosDelTotal): readonly ErrorDelTotal[] | null => {
      if (!libre) return [{ campo: 'total_en', mensaje: ESPERA_A_LA_FILA }]
      const r = cambiarTotal(trabajo, cambios)
      if (!r.ok) return r.errores
      return cambiar(r.formula) ? null : [{ campo: 'total_en', mensaje: ESPERA_A_LA_FILA }]
    },
  }
}

export type BandasDeLaPlanilla = ReturnType<typeof useBandasDeLaPlanilla>
