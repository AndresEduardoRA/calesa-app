'use client'

import { useCallback, useMemo, useReducer } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { mismoJson } from '../../../entities/json-de-la-base'
import {
  TOPE_EN_BYTES_DE_LA_CUADRICULA,
  type PlantillaEnCuadricula,
} from '../../../entities/cuadricula-de-la-tarjeta'
import {
  bytesDe,
  MOTIVO_DE_LOS_BYTES_AL_GUARDAR,
} from '../../../entities/plantilla/edicion/limites'
import { mapaDeLaGrilla } from '../../../entities/plantilla/edicion/mapa-de-la-grilla'
import {
  estadoInicial,
  reductorDelEditor,
  type AccionDelEditor,
} from '../../../entities/plantilla/edicion/reductor'
import { formaDeCuadricula } from '../../../entities/plantilla/forma-de-cuadricula'
import type { RechazoDePlantilla } from '../../../entities/plantilla/motivos-de-plantilla'
import {
  validarPlantilla,
  type ContextoDePlantilla,
} from '../../../entities/plantilla/validar-plantilla'

type Args = {
  origenId: string
  // El `actualizadoEn` del borrador leído, tal cual: la clave del borrador de estado es por versión.
  esperada: string | null
  // La cuadrícula de la que nace el editor y la guardada en el borrador (nula sin borrador, o si es de la forma 1: hay que guardarla convertida).
  inicial: PlantillaEnCuadricula
  guardada: PlantillaEnCuadricula | null
  contexto: ContextoDePlantilla
}

type Valores = { plantilla: PlantillaEnCuadricula }

// El estado del editor de la tarjeta: el reductor (la cuadrícula de trabajo, lo elegido, deshacer y rehacer, lo copiado, la celda en la que se escribe), la forma y
// la validación contra la fórmula, que corren en cada cambio, y el borrador en la pestaña. «Guardar borrador» depende de la forma (con los 24 KiB) y de que haya
// cambios; lo que sólo la validación completa rechaza (un nodo restringido, un color fuera del catálogo: lo cruza **publicar**) se dice arriba y no apaga nada.
export function useEditorDeLaCuadricula({ origenId, esperada, inicial, guardada, contexto }: Args) {
  const [estado, despachar] = useReducer(reductorDelEditor, inicial, estadoInicial)
  const { plantilla } = estado

  const bytes = useMemo(() => bytesDe(plantilla), [plantilla])
  const forma = useMemo(() => validarPlantilla(plantilla, null, { conTope: false }), [plantilla])
  const completa = useMemo(
    () => validarPlantilla(plantilla, contexto, { conTope: false }),
    [plantilla, contexto],
  )
  const pasaDelTope = bytes > TOPE_EN_BYTES_DE_LA_CUADRICULA
  const rechazoDeForma: RechazoDePlantilla | null = forma.ok ? null : forma.error
  const motivoParaNoGuardar = pasaDelTope
    ? MOTIVO_DE_LOS_BYTES_AL_GUARDAR
    : (rechazoDeForma?.mensaje ?? null)
  const rechazoParaPublicar: RechazoDePlantilla | null =
    forma.ok && !completa.ok ? completa.error : null
  // Sin borrador (o con uno de la forma 1), «Guardar borrador» está activo desde el principio: crea el borrador con lo que se ve.
  const hayCambios = useMemo(
    () => guardada === null || !mismoJson(plantilla, guardada),
    [plantilla, guardada],
  )
  const puedeGuardar = motivoParaNoGuardar === null && hayCambios
  const mapa = useMemo(() => mapaDeLaGrilla(plantilla), [plantilla])

  const valores = useMemo<Valores>(() => ({ plantilla }), [plantilla])
  // Lo guardado contra lo que se mide el borrador de la pestaña: la plantilla de trabajo si tiene el mismo contenido (la base devuelve las claves en otro orden y
  // `useBorradorDeEstado` compara el texto), o la inicial.
  const base = useMemo<Valores>(
    () => ({ plantilla: mismoJson(plantilla, inicial) ? plantilla : inicial }),
    [plantilla, inicial],
  )
  const { limpiar } = useBorradorDeEstado<Valores>({
    clave: `tarjeta-cuadricula:${origenId}:${esperada ?? 'nueva'}`,
    valores,
    guardado: base,
    alReponer: (cambios) => {
      // Sólo se repone lo que todavía es una cuadrícula: lo demás (otra versión del editor) no. Reponer es un paso: Ctrl+Z vuelve a lo guardado.
      const repuesta = formaDeCuadricula(cambios.plantilla, { conTope: false })
      if (!repuesta.ok) return
      const esLaInicial = mismoJson(repuesta.plantilla, inicial)
      despachar({
        tipo: 'reponer',
        plantilla: repuesta.plantilla,
        nombre: esLaInicial ? 'descartar lo recuperado' : 'recuperar lo escrito',
      })
    },
  })

  const hacer = useCallback((accion: AccionDelEditor) => {
    despachar(accion)
  }, [])

  return {
    estado,
    plantilla,
    mapa,
    hacer,
    bytes,
    rechazoDeForma,
    motivoParaNoGuardar,
    rechazoParaPublicar,
    hayCambios,
    puedeGuardar,
    limpiar,
  }
}

export type EditorDeLaCuadricula = ReturnType<typeof useEditorDeLaCuadricula>
