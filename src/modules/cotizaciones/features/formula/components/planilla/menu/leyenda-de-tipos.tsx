import { ETIQUETA_DEL_TIPO, TIPOS_DE_CELDA } from '../../../../../entities/formula/tipo-de-celda'
import { FONDO_DEL_TIPO } from '../cuadricula/clases'

// Los ocho tipos de celda con el fondo que les da la columna C (D10): arriba de la grilla, para leer los colores sin abrir el menú.
export function LeyendaDeTipos() {
  return (
    <ul
      aria-label="Tipos de celda"
      className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-(length:--text-xs) text-(--color-ink-soft)"
    >
      {TIPOS_DE_CELDA.map((tipo) => (
        <li key={tipo} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-3 shrink-0 rounded-sm border border-(--color-line-strong) ${FONDO_DEL_TIPO[tipo]}`}
          />
          {ETIQUETA_DEL_TIPO[tipo]}
        </li>
      ))}
    </ul>
  )
}
