'use client'

import { useSyncExternalStore } from 'react'

// Si una guardada es la aprobada de su vehículo, para la línea «Hacer privada» del «⋯» (`PrivadaDelMenu`): el núcleo no lee la marca de la aprobada, la anota el área
// `aprobada` desde su hueco de la cabecera (`AnotarAprobada`) y la pone al día cuando otra isla aprueba. Sin anotación (el área no está o su lectura falló), nulo: la base
// decide al intentarlo.
const anotadas = new Map<string, boolean>()
const escuchas = new Set<() => void>()

function avisar(): void {
  for (const escucha of escuchas) {
    escucha()
  }
}

export function anotarAprobada(id: string, aprobada: boolean): void {
  if (anotadas.get(id) === aprobada) return
  anotadas.set(id, aprobada)
  avisar()
}

export function olvidarAprobada(id: string): void {
  if (!anotadas.delete(id)) return
  avisar()
}

function suscribir(escucha: () => void): () => void {
  escuchas.add(escucha)
  return () => {
    escuchas.delete(escucha)
  }
}

export function useAprobadaAnotada(id: string): boolean | null {
  return useSyncExternalStore(
    suscribir,
    () => anotadas.get(id) ?? null,
    () => null,
  )
}
