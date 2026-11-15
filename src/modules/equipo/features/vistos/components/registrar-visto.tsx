'use client'

import { useEffect } from 'react'
import type { ModuloDeVistos, TipoDeVistos } from '../../../entities/vistos'
import { registrarVistoAlUsar } from '../pedidos-de-vistos'
import { usePreferenciaDeVistos } from './proveedor-de-vistos'

// Abrir la ficha de un registro lo marca visto en su módulo (la base no vuelve a escribir dentro de 30 s). No dibuja nada.
export function RegistrarVisto({
  modulo,
  tipo,
  id,
}: {
  modulo: ModuloDeVistos
  tipo: TipoDeVistos
  id: string
}) {
  const { activado } = usePreferenciaDeVistos()
  useEffect(() => {
    if (activado) void registrarVistoAlUsar(modulo, tipo, id)
  }, [modulo, tipo, id, activado])
  return null
}
