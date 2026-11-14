// Qué dicen los tramos de color de la gráfica: el amarillo son los demorados y el rojo, los trabados. Con texto: el color solo no alcanza.
export function LeyendaDeLaGrafica() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-(length:--text-xs) text-(--color-ink-soft)">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm bg-(--viz-aviso)" />
        Demorados
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm bg-(--viz-critico)" />
        Trabados (demorados a los que les falta algo para pasar)
      </span>
    </p>
  )
}
