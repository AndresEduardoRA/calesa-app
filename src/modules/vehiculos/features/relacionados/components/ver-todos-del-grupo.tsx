'use client'

import { Button } from '@/shared/ui/button'

// «Ver todos» de un grupo: un botón que abre su drawer en el lugar. Lo usan el popover de un chip y la presentación compacta.
export type VerTodosDeUnGrupo = { abrir: () => void }

const TAMANO = 'min-h-11 w-fit md:min-h-8'

export function VerTodosDelGrupo({ verTodos }: { verTodos: VerTodosDeUnGrupo }) {
  return (
    <Button type="button" variant="ghost" size="sm" className={TAMANO} onClick={verTodos.abrir}>
      Ver todos
    </Button>
  )
}
