import { Aviso } from '@/shared/ui/aviso'

type Props = {
  // La pregunta de reemplazo (`preguntaDeReemplazo()`), nula sin borradores.
  pregunta: string | null
  avisos: readonly string[]
}

// Antes de escribir: lo que se reemplaza y lo que el origen o la empresa no tienen, sin bloquear (los borradores se crean igual).
export function PasoDeConfirmar({ pregunta, avisos }: Props) {
  return (
    <div className="grid min-w-0 gap-3">
      {pregunta === null ? null : <p className="text-(--color-ink)">{pregunta}</p>}
      {avisos.map((aviso) => (
        <Aviso key={aviso} tono="aviso">
          {aviso}
        </Aviso>
      ))}
    </div>
  )
}
