'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { TodosAbiertos } from '../hooks/use-todos-de-la-ficha'
import { TodosLosRecordatoriosDiferido, TodosLosSeguimientosDiferido } from './diferidos'

type Props = {
  leadId: string
  leadNombre: string
  todos: TodosAbiertos
}

// «Ver todos» del bloque «Seguimientos y recordatorios» (`?todos=`): la línea de tiempo completa (de a 20 hasta 500, «Ir a una fecha») o
// todos tus recordatorios (con «Completados»), leídos desde el navegador al abrirse; su código también llega al abrirse. No tiene
// formulario: lo que se escribe va en sus modales, que guardan su borrador. Si algo cambió adentro, al cerrarse la ficha se vuelve a leer
// una vez (el resumen de atrás se pone al día).
export function DrawerDeTodos({ leadId, leadNombre, todos }: Props) {
  const router = useRouter()
  const cambio = useRef(false)
  const abierto = todos.abierto
  const ultimo = useUltimo(abierto)
  const mostrado = abierto ?? ultimo
  const montar = useAbiertoAlgunaVez(abierto !== null)
  useEffect(() => {
    if (abierto === null && cambio.current) {
      cambio.current = false
      router.refresh()
    }
  }, [abierto, router])
  if (!montar) {
    return null
  }
  const alCambiar = () => {
    cambio.current = true
  }
  return (
    <Drawer
      abierto={abierto !== null}
      alCerrar={todos.cerrar}
      titulo={
        mostrado === 'recordatorios'
          ? `Tus recordatorios sobre ${leadNombre}`
          : `Seguimientos de ${leadNombre}`
      }
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      {mostrado === 'recordatorios' ? (
        <TodosLosRecordatoriosDiferido key={leadId} leadId={leadId} />
      ) : mostrado === 'seguimientos' ? (
        <TodosLosSeguimientosDiferido key={leadId} leadId={leadId} alCambiar={alCambiar} />
      ) : null}
    </Drawer>
  )
}
