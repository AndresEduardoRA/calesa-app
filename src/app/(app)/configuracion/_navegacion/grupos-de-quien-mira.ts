import { connection } from 'next/server'
import { cache } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from '../secciones'

// Lo que el menú, el selector y el buscador de Configuración reciben: las secciones que esta persona puede abrir. Una vez por request:
// quienes lo piden (el layout y la página de inicio) reciben el mismo arreglo y el payload lo manda una sola vez.
export const gruposDeQuienMira = cache(async (): Promise<GrupoDelNavegador[]> => {
  await connection()
  const { permisos } = await requerirSesion()
  return paraElNavegador(gruposVisibles(permisos))
})
