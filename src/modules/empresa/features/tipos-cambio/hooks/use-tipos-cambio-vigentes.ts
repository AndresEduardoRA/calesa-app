'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import { MENSAJE_INESPERADO, type ErrorApp } from '@/shared/lib/errores'
import { leerTiposCambioVigentes } from '../../../composicion-barra.client'
import { TOPE_DEL_POPOVER, type TipoCambioVigente } from '../../../entities/tipos-cambio-vigentes'

export type VigentesDelPopover =
  | { estado: 'leyendo'; filas: null }
  | { estado: 'listo'; filas: TipoCambioVigente[]; hayMas: boolean }
  | { estado: 'error'; filas: null; error: ErrorApp }

const LEYENDO: VigentesDelPopover = { estado: 'leyendo', filas: null }

// Lo del popover de la barra: se lee al abrirlo (se monta con él), fresco, para editar sobre la versión de hoy. `releer()` (tras guardar o
// ante un conflicto) deja a la vista lo que había mientras lee y devuelve lo leído; `reintentar()` vuelve al esqueleto. Con dos lecturas
// en vuelo gana la última (el doble montaje de StrictMode, o releer mientras lee).
export function useTiposCambioVigentes() {
  const [vigentes, setVigentes] = useState<VigentesDelPopover>(LEYENDO)
  const ultimo = useRef(0)

  const leer = useCallback(async (): Promise<TipoCambioVigente[] | null> => {
    const pedido = ++ultimo.current
    const lectura = await leerTiposCambioVigentes().catch(() => null)
    const vigente = pedido === ultimo.current
    if (lectura?.ok) {
      if (vigente) {
        setVigentes({ estado: 'listo', ...cortarAlTope(lectura.data, TOPE_DEL_POPOVER) })
      }
      return lectura.data
    }
    // Releer sin suerte no tapa lo que ya se veía; la primera lectura sí dice que falló.
    if (vigente) {
      const error = lectura?.error ?? { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }
      setVigentes((antes) =>
        antes.estado === 'listo' ? antes : { estado: 'error', filas: null, error },
      )
    }
    return null
  }, [])

  useEffect(() => {
    void leer()
  }, [leer])

  return {
    vigentes,
    releer: leer,
    reintentar: () => {
      setVigentes(LEYENDO)
      void leer()
    },
  }
}
