'use client'

import { useMemo, useState } from 'react'
import { cambiosDeEstado } from '@/shared/lib/borrador'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { LegalesDelSitio } from '../../../../entities/contenido/legales'
import { valoresDeLegales, type ValoresDeLegalesEnPantalla } from './valores-de-legales'

// Lo que la pestaña edita, con su borrador en `sessionStorage` (los dos documentos incluidos): al volver se repone lo escrito y se avisa con
// «Descartar». Quien la usa remonta el formulario con la versión de la fila como `key`.
export function useValoresDeLegales(legales: LegalesDelSitio) {
  const guardado = useMemo(() => valoresDeLegales(legales), [legales])
  const [valores, setValores] = useState<ValoresDeLegalesEnPantalla>(guardado)
  const cambiar = (cambios: Partial<ValoresDeLegalesEnPantalla>) => {
    setValores((antes) => ({ ...antes, ...cambios }))
  }
  const borrador = useBorradorDeEstado({
    clave: 'web-legales',
    valores,
    guardado,
    alReponer: cambiar,
  })
  // Algo escrito que difiere de lo guardado (los títulos sin los espacios de los bordes: al guardar se recortan).
  const hayCambios = Object.keys(cambiosDeEstado(valores, guardado)).length > 0
  // Vuelve a lo guardado y borra el borrador.
  const descartar = () => {
    setValores(guardado)
    borrador.limpiar()
  }
  return { valores, cambiar, borrador, hayCambios, descartar }
}
