'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button, buttonVariants } from '@/shared/ui/button'

// «Ver todos» de un grupo: un enlace a la ficha con su drawer (desde un resumen) o un botón que abre el drawer. Lo usan el popover de un chip y la presentación compacta.
export type VerTodosDeUnGrupo = { href: string } | { abrir: () => void }

const TAMANO = 'min-h-11 w-fit md:min-h-8'

export function VerTodosDelGrupo({ verTodos }: { verTodos: VerTodosDeUnGrupo }) {
  return 'href' in verTodos ? (
    <Link
      href={verTodos.href as Route}
      className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} ${TAMANO}`}
    >
      Ver todos
    </Link>
  ) : (
    <Button type="button" variant="ghost" size="sm" className={TAMANO} onClick={verTodos.abrir}>
      Ver todos
    </Button>
  )
}
