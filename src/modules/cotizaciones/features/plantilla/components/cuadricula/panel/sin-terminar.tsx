// Arriba de una regla a medio armar (la lista de respaldo, las condiciones de una celda o de una fila): lo que falta se dice en su lugar y nada se manda.
export function SinTerminar({ fila = false }: { fila?: boolean }) {
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-aviso-ink)">
      {fila
        ? 'Sin terminar: la fila no cambia hasta completarla.'
        : 'Sin terminar: la celda no cambia hasta completarla.'}
    </p>
  )
}
