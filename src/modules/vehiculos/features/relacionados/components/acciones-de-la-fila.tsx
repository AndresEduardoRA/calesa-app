'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista/mas-acciones'
import type { AccionDeRelacionados } from '../../../entities/acciones-de-relacionados'

type Props = {
  // «Más acciones de Ana Quispe»: de quién es la fila.
  nombre: string
  acciones: readonly AccionDeRelacionados[]
  enCurso: boolean
  alElegir: (accion: AccionDeRelacionados) => void
}

// El «⋯» de una fila de «Relacionados»: sus acciones (calculadas en `entities/acciones-de-relacionados.ts`) como líneas del menú. Un enlace navega; lo demás lo hace `alElegir`.
export function AccionesDeLaFila({ nombre, acciones, enCurso, alElegir }: Props) {
  const router = useRouter()
  if (acciones.length === 0) {
    return null
  }
  const lineas: AccionDeMenu[] = acciones.map((accion) => ({
    tipo: 'accion',
    clave:
      accion.tipo === 'enlace'
        ? accion.clave
        : accion.tipo === 'elegir-lead'
          ? accion.clave
          : accion.tipo,
    etiqueta: accion.etiqueta,
    deshabilitada: enCurso && accion.tipo !== 'enlace',
    // Lo que abre un panel espera a que el menú termine de cerrarse: si no, el foco que vuelve al botón lo cierra.
    despuesDeCerrar:
      accion.tipo === 'elegir-lead' ||
      (accion.tipo === 'desvincular' && accion.modo === 'confirmar'),
    alElegir: () => {
      if (accion.tipo === 'enlace') {
        router.push(accion.href as Route)
      } else {
        alElegir(accion)
      }
    },
  }))
  return <MasAcciones nombre={nombre} acciones={lineas} />
}
