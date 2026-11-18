'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { ID_DEL_ICONO_OJO, IconoDeLista } from './simbolos-de-lista'

// «Visto» y «último visto» en una fila o tarjeta de una lista (`docs/GLOSARIO.md`). Qué está visto lo decide el módulo (`ProveedorDeMarcasDeVisto`
// de `equipo`, que llena este contexto con una lectura por página); acá sólo cómo se ve, como un correo: el nombre (`[data-abre-resumen]`) va en
// negrita si no está visto (`nuevo`) y en peso normal si ya se abrió (`visto`, también el último). El último lleva además un borde de acento y un
// ojo chico junto al nombre (`<SufijoDeVisto>`: tooltip y texto para el lector «Último visto», sin texto a la vista); lo visto dice «visto» para el
// lector: nada depende sólo del peso o del color. Sin marca
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
  'data-[visto=nuevo]:[&_[data-abre-resumen]]:font-bold data-[visto=visto]:[&_[data-abre-resumen]]:font-normal data-[visto=ultimo]:[&_[data-abre-resumen]]:font-normal data-[visto=ultimo]:shadow-[inset_3px_0_0_var(--color-primario-ink)]'

// El mismo borde en una fila de tabla: un `box-shadow` sobre un `<tr>` no se dibuja, va en su primera celda.
export const CLASES_DE_VISTO_DE_FILA =
  'data-[visto=ultimo]:[&>:first-child]:shadow-[inset_3px_0_0_var(--color-primario-ink)]'

// El peso del nombre cuando el elemento no es una fila ni una tarjeta con `data-visto` (el enlace de «dónde está»): la misma regla en una clase.
export function pesoDelNombre(marca: MarcaDeVistoDeLista): string | undefined {
  if (marca === 'nuevo') return 'font-bold'
  return marca === 'visto' || marca === 'ultimo' ? 'font-normal' : undefined
}

// Lo que se marca junto al nombre: el último, un ojo chico de acento (un `<use>` al sprite de `simbolos-de-lista.tsx`: tres nodos y sólo en el
// único ítem «último» de la página), con el tooltip nativo «Último visto» y el mismo texto, sólo para el lector (el icono no se anuncia); lo visto,
// «visto» sólo para el lector. En línea y del alto de la letra: no parte el nombre en dos renglones ni se achica si el nombre se corta.
export function SufijoDeVisto({ id }: { id: string }) {
  const marca = useVistoDeLista(id)
  if (marca === 'ultimo') {
    return (
      <span
        title="Último visto"
        className="ml-1 inline-flex shrink-0 align-[-0.15em] text-(--color-primario-ink) [&>svg]:size-3.5"
      >
        <IconoDeLista id={ID_DEL_ICONO_OJO} />
        <span className="sr-only">, último visto</span>
      </span>
    )
  }
  return marca === 'visto' ? <span className="sr-only">, visto</span> : null
}
