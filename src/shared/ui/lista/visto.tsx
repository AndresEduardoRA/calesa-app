'use client'

import { createContext, useContext, type ReactNode } from 'react'

// «Visto» y «último visto» en una fila o tarjeta de una lista (`docs/GLOSARIO.md`). Qué está visto lo decide el módulo (`ProveedorDeMarcasDeVisto`
// de `equipo`, que llena este contexto con una lectura por página); acá sólo cómo se ve, como un correo: el nombre (`[data-abre-resumen]`) va en
// negrita si no está visto (`nuevo`) y en peso normal si ya se abrió (`visto`, también el último). El último lleva además un borde de acento y el
// texto «Último visto» junto al nombre (`<SufijoDeVisto>`); lo visto dice «visto» para el lector: nada depende sólo del peso o del color. Sin marca
// (`null`: «Vistos» apagado, sin leer aún o fuera de lo leído) el nombre queda en su peso de siempre.
export type MarcaDeVistoDeLista = 'nuevo' | 'visto' | 'ultimo' | null

const Contexto = createContext<(id: string) => MarcaDeVistoDeLista>(() => null)

export function ProveedorDeVistosDeLista({
  marca,
  children,
}: {
  marca: (id: string) => MarcaDeVistoDeLista
  children: ReactNode
}) {
  return <Contexto value={marca}>{children}</Contexto>
}

// La marca de un registro de la página (sin proveedor: ninguna).
export function useVistoDeLista(id: string | undefined): MarcaDeVistoDeLista {
  const marca = useContext(Contexto)
  return id === undefined ? null : marca(id)
}

export const CLASES_DE_VISTO =
  'data-[visto=nuevo]:[&_[data-abre-resumen]]:font-bold data-[visto=visto]:[&_[data-abre-resumen]]:font-normal data-[visto=ultimo]:[&_[data-abre-resumen]]:font-normal data-[visto=ultimo]:shadow-[inset_3px_0_0_var(--color-primario)]'

// El peso del nombre cuando el elemento no es una fila ni una tarjeta con `data-visto` (el enlace de «dónde está»): la misma regla en una clase.
export function pesoDelNombre(marca: MarcaDeVistoDeLista): string | undefined {
  if (marca === 'nuevo') return 'font-bold'
  return marca === 'visto' || marca === 'ultimo' ? 'font-normal' : undefined
}

// Lo que se dice junto al nombre: «Último visto» a la vista; «visto», sólo para el lector de pantalla.
export function SufijoDeVisto({ id }: { id: string }) {
  const marca = useVistoDeLista(id)
  if (marca === 'ultimo') {
    return (
      <span className="ml-1.5 inline-block rounded-(--radius-sm) bg-(--color-primario-soft) px-1.5 align-middle text-(length:--text-xs) font-medium text-(--color-primario-ink)">
        Último visto
      </span>
    )
  }
  return marca === 'visto' ? <span className="sr-only">, visto</span> : null
}
