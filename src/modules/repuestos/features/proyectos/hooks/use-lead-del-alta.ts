'use client'

import { useEffect, useRef, useState } from 'react'
import { MENSAJE_LEAD_QUE_NO_SE_VE } from '../../../entities/proyectos/paneles'
import type { Elegido } from '../../../entities/proyectos/cliente-del-formulario'

// El `?lead=<id>` de la URL: el que deja «Nuevo lead» al guardar (o un enlace directo), y cómo lo resolvió el servidor con la RLS de quien mira (`titulo` nulo: no
// existe o no se ve). Lo compone `src/app` con `leads`.
export type LeadDeLaUrl = {
  enLaUrl: string | null
  resuelto: { id: string; titulo: string | null } | null
  soltar: () => void
}

type Args = {
  lead: LeadDeLaUrl
  puedeVerLeads: boolean
  alElegir: (lead: Elegido) => void
}

type Atendido = { id: string; titulo: string | null }

// Elige el lead de `?lead=` cuando el servidor ya lo resolvió (hasta entonces, «trayendo») y suelta la clave; uno que no se ve deja su aviso. Sin `leads.ver`
// sólo suelta la clave. Va después del borrador: lo elegido acá pisa lo que el borrador repuso.
export function useLeadDelAlta({ lead, puedeVerLeads, alElegir }: Args) {
  const { enLaUrl, resuelto } = lead
  const listo = resuelto !== null && resuelto.id === enLaUrl ? resuelto : null
  // El último `?lead=` ya resuelto: se anota al dibujar (cambia con la URL y la respuesta del servidor) y se atiende una vez.
  const [atendido, setAtendido] = useState<Atendido | null>(null)
  if (listo !== null && atendido?.id !== listo.id) {
    setAtendido({ id: listo.id, titulo: listo.titulo })
  }
  const hecho = useRef<string | null>(null)
  const elegir = useRef(alElegir)
  const soltar = useRef(lead.soltar)
  useEffect(() => {
    elegir.current = alElegir
    soltar.current = lead.soltar
  })
  useEffect(() => {
    if (atendido === null || hecho.current === atendido.id) {
      return
    }
    hecho.current = atendido.id
    if (puedeVerLeads && atendido.titulo !== null) {
      elegir.current({ id: atendido.id, titulo: atendido.titulo })
    }
    soltar.current()
  }, [atendido, puedeVerLeads])

  return {
    trayendo: puedeVerLeads && enLaUrl !== null && listo === null,
    aviso:
      puedeVerLeads && atendido !== null && atendido.titulo === null
        ? MENSAJE_LEAD_QUE_NO_SE_VE
        : null,
  }
}
