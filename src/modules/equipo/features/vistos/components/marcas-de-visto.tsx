'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { ProveedorDeVistosDeLista } from '@/shared/ui/lista'
import type { ModuloDeVistos, TipoDeVistos } from '../../../entities/vistos'
import { useVistos } from '../hooks/use-vistos'

type Props = {
  modulo: ModuloDeVistos
  tipo: TipoDeVistos
  // Los ids de la página que se dibuja: una lectura por página.
  ids: readonly string[]
  // El registro abierto ahora (el resumen de `?vehiculo=`, `?lead=`…): abrirlo, también desde la URL, lo marca visto.
  abierto: string | null
  children: ReactNode
}

// Las marcas de «visto» de una página de una lista: las filas y tarjetas de `@/shared/ui/lista` las leen solas con `idDeVisto`.
export function ProveedorDeMarcasDeVisto({ modulo, tipo, ids, abierto, children }: Props) {
  const consultas = useMemo(() => [{ tipo, ids }], [tipo, ids])
  const { marca, abrir } = useVistos(modulo, consultas)
  useEffect(() => {
    if (abierto !== null) abrir(tipo, abierto)
  }, [abierto, abrir, tipo])
  return <ProveedorDeVistosDeLista marca={marca}>{children}</ProveedorDeVistosDeLista>
}
