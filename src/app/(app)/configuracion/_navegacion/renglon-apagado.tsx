// Una sub-sección que la persona no puede abrir y declara su motivo: un renglón del menú que no es un enlace, con el estilo de
// `EnlaceDelMenu` apagado y, debajo, el motivo en texto visible (el lector lo lee por `aria-describedby`). Se dibuja en el servidor.
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
        className="flex min-h-9 cursor-not-allowed items-center rounded-(--radius-md) px-2.5 py-1.5 text-(length:--text-sm) text-(--color-ink-faint)"
      >
        {titulo}
      </span>
      <p id={idDelMotivo} className="px-2.5 text-(length:--text-xs) text-(--color-ink-soft)">
        {motivo}
      </p>
    </div>
  )
}
