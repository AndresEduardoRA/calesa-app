import { TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// Las columnas de la hoja de ítems, en su orden: primero qué es el ítem, luego cantidad, precio y el siguiente; los demás datos después. Cada título lleva su ayuda en
// un `title` (subrayado punteado para que se note): un «?» con `Popover` arrastraría Base UI a la carga en frío por diez encabezados. Texto de interfaz, no regla:
// ninguna ayuda nombra un valor de catálogo.
export const COLUMNAS_DE_LA_HOJA = [
  {
    clave: 'item',
    titulo: 'Ítem',
    ayuda: 'Ítem: tipo de pieza, condición y descripción',
    clase: 'min-w-72',
  },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    ayuda: 'Cantidad: cuántas unidades se piden',
    clase: 'min-w-28 text-right',
  },
  {
    clave: 'precio',
    titulo: 'Precio al cliente',
    ayuda: 'Precio al cliente: lo que se le cobra por unidad',
    clase: 'min-w-40 text-right',
  },
  {
    clave: 'siguiente',
    titulo: 'Siguiente',
    ayuda: 'Siguiente: lo que toca hacer para que el ítem avance de paso',
    clase: 'min-w-44',
  },
  {
    clave: 'pais',
    titulo: 'País de origen',
    ayuda: 'País de origen: de dónde viene la pieza',
    clase: '',
  },
  {
    clave: 'via',
    titulo: 'Vía de transporte',
    ayuda: 'Vía de transporte: cómo viaja la pieza',
    clase: '',
  },
  { clave: 'moneda', titulo: 'Moneda', ayuda: 'Moneda: la del precio al cliente', clase: '' },
  {
    clave: 'tracking',
    titulo: 'Tracking',
    ayuda: 'Tracking: el número de seguimiento del envío',
    clase: 'min-w-36',
  },
  {
    clave: 'notas',
    titulo: 'Notas',
    ayuda: 'Notas: lo que el equipo anota del ítem',
    clase: 'min-w-48',
  },
  { clave: 'acciones', titulo: 'Acciones', ayuda: null, clase: '' },
] as const

export type ClaveDeColumna = (typeof COLUMNAS_DE_LA_HOJA)[number]['clave']

export const CANTIDAD_DE_COLUMNAS = COLUMNAS_DE_LA_HOJA.length

/** El título de una columna (también la etiqueta de su campo en la tarjeta de la lista). */
export const tituloDe = (clave: ClaveDeColumna): string =>
  COLUMNAS_DE_LA_HOJA.find((c) => c.clave === clave)?.titulo ?? clave

/** La clase de la columna: la misma en su `<th>` y en sus celdas. */
export const claseDe = (clave: ClaveDeColumna): string =>
  COLUMNAS_DE_LA_HOJA.find((c) => c.clave === clave)?.clase ?? ''

export function EncabezadoDeLaHoja() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNAS_DE_LA_HOJA.map((columna) => (
          <TableHead key={columna.clave} className={columna.clase}>
            {columna.ayuda === null ? (
              columna.titulo
            ) : (
              <span
                title={columna.ayuda}
                className="cursor-help underline decoration-dotted underline-offset-4"
              >
                {columna.titulo}
              </span>
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}
