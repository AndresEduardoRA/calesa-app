// El encabezado de una página de Configuración: su título (`h1`) y una frase de qué se configura ahí. Los dos salen del registro
// (`secciones.ts`), la única fuente: el menú dibuja el mismo título.
export function EncabezadoDeConfiguracion({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <div className="grid gap-1">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">{titulo}</h1>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
    </div>
  )
}
