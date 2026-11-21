import { TextoConVariables } from './texto-con-variables'

type Props = {
  etiqueta: string
  texto: string
  claves: readonly string[]
  valores: Readonly<Record<string, string>>
}

// Cómo le llega el texto a quien lo recibe, con datos de ejemplo. Se dibuja como texto, nunca como HTML.
export function VistaPreviaDelTexto({ etiqueta, texto, claves, valores }: Props) {
  return (
    <div className="grid gap-1.5">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">{etiqueta}</span>
      <div
        role="group"
        aria-label={etiqueta}
        className="rounded-(--radius-md) bg-(--color-surface-2) p-3 text-(length:--text-sm) break-words whitespace-pre-wrap text-(--color-ink)"
      >
        <TextoConVariables texto={texto} claves={claves} valores={valores} resaltar={false} />
      </div>
    </div>
  )
}
