// Una sub-sección que la persona no puede abrir y declara su motivo: un renglón del menú que no es un enlace, con el estilo de
// una sub-sección de `EnlaceDelMenu` apagado y, debajo, el motivo en texto visible (el lector lo lee por `aria-describedby`). Se dibuja en el servidor.
export function RenglonApagado({
  clave,
  titulo,
  motivo,
}: {
  clave: string
  titulo: string
  motivo: string
}) {
  const idDelMotivo = `motivo-de-${clave}`
  return (
    <div className="grid gap-0.5">
      <span
        aria-disabled="true"
        aria-describedby={idDelMotivo}
        className="flex min-h-8 cursor-not-allowed items-center py-1 pr-2 pl-3 text-(length:--text-sm) text-(--color-ink-faint)"
      >
        {titulo}
      </span>
      <p id={idDelMotivo} className="pl-3 text-(length:--text-xs) text-(--color-ink-soft)">
        {motivo}
      </p>
    </div>
  )
}
