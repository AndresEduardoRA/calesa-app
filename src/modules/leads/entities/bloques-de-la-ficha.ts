// Los bloques de la ficha del lead (`/leads/[id]`) en dos columnas: cuáles van en el índice de la derecha, en qué orden y quién los ve,
// a qué bloque lleva cada `?seccion=` de los enlaces de siempre, y lo que se lee de cada uno a la vista. Nada acá sabe de React.
import type { LoQueVe, SeccionDeLead } from './ficha'

export type AnclaDeBloque = 'seguimientos' | 'oportunidades' | 'relacionados' | 'cotizaciones'

export type BloqueDeLaFicha = {
  ancla: AnclaDeBloque
  // Lo que dice el índice.
  etiqueta: string
  // El título del bloque (su `h2`).
  titulo: string
  // Qué tiene que ver quien mira para que el bloque exista (sin esto: siempre).
  pide?: keyof LoQueVe
}

// En el orden del índice y de la columna de la derecha. El portal no está: vive en la izquierda, bajo «Quién lo tiene».
export const BLOQUES_DE_LA_FICHA: readonly BloqueDeLaFicha[] = [
  { ancla: 'seguimientos', etiqueta: 'Seguimientos', titulo: 'Seguimientos y recordatorios' },
  {
    ancla: 'oportunidades',
    etiqueta: 'Oportunidades',
    titulo: 'Tus oportunidades',
    pide: 'oportunidades',
  },
  { ancla: 'relacionados', etiqueta: 'Relacionados', titulo: 'Relacionados', pide: 'vehiculos' },
  { ancla: 'cotizaciones', etiqueta: 'Cotizaciones', titulo: 'Cotizaciones', pide: 'cotizaciones' },
]

// El bloque «Acceso al portal», en la columna de la izquierda (sin entrada en el índice).
export const ANCLA_DEL_PORTAL = 'portal'

// Los bloques que quien mira ve, en su orden: uno sin permiso no se dibuja ni aparece en el índice.
export function bloquesDelIndice(ve: LoQueVe): readonly BloqueDeLaFicha[] {
  return BLOQUES_DE_LA_FICHA.filter((bloque) => !bloque.pide || ve[bloque.pide])
}

export function bloqueDeLaFicha(ancla: AnclaDeBloque): BloqueDeLaFicha {
  const bloque = BLOQUES_DE_LA_FICHA.find((uno) => uno.ancla === ancla)
  if (!bloque) {
    throw new Error(`No hay un bloque «${ancla}» en la ficha del lead.`)
  }
  return bloque
}

// A qué bloque lleva un `?seccion=` (ya validado con `seccionDeLead()`): «Datos» es el principio de la ficha (nada que saltar), «Vehículos»
// es Relacionados (con la gestión al pie) y el resto, el bloque de su nombre.
const ANCLA_DE_LA_SECCION: Record<SeccionDeLead, string | null> = {
  datos: null,
  seguimientos: 'seguimientos',
  vehiculos: 'relacionados',
  oportunidades: 'oportunidades',
  cotizaciones: 'cotizaciones',
  portal: ANCLA_DEL_PORTAL,
}

export function anclaDeLaSeccion(seccion: SeccionDeLead): string | null {
  return ANCLA_DE_LA_SECCION[seccion]
}

// «Ver todos» de seguimientos o de recordatorios: un drawer con su propia clave en la URL (`?todos=`), que convive con los modales de
// `?panel=`.
export const CLAVE_DE_TODOS = 'todos'
export const TODOS_DE_LA_FICHA = ['seguimientos', 'recordatorios'] as const
export type TodosDeLaFicha = (typeof TODOS_DE_LA_FICHA)[number]

// Lo que el bloque «Seguimientos y recordatorios» lee y muestra a la vista: los últimos seguimientos y los recordatorios pendientes más
// próximos (de `recordar_en` ascendente: los vencidos primero). Lo demás, en «Ver todos».
export const PRIMEROS_DE_SEGUIMIENTOS = 3
export const PRIMEROS_DE_RECORDATORIOS = 3
