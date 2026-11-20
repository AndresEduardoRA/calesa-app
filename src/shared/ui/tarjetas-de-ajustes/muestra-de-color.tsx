// Un color a la vista: un cuadrito con borde y el valor en texto, nunca sólo el color (quien no distingue colores lee el hex).
// `color` es lo que la persona eligió, no un token: va en `style`.
export function MuestraDeColor({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-(--radius-sm) border border-(--color-line-strong)"
        style={{ background: color }}
      />
      <span className="font-mono">{color}</span>
    </span>
  )
}
