import { AYUDA_DE_VE, ETIQUETA_DE_VE } from '../../../../entities/cuadro-de-cotizaciones'

const ESCALONES = ['suyas', 'sin_privadas', 'todas'] as const

// Qué quiere decir cada escalón de «Ve» y, en un origen, de dónde sale lo que no se puede bajar.
export function LeyendaDelCuadro({ enUnOrigen }: { enUnOrigen: boolean }) {
  return (
    <div className="grid gap-1 text-(length:--text-xs) text-(--color-ink-faint)">
      <dl className="grid gap-1">
        {ESCALONES.map((ve) => (
          <div key={ve}>
            <dt className="inline font-medium text-(--color-ink)">{ETIQUETA_DE_VE[ve]}:</dt>{' '}
            <dd className="inline">{AYUDA_DE_VE[ve]}</dd>
          </div>
        ))}
      </dl>
      {enUnOrigen ? (
        <p>En un origen vale también lo que el rol tiene en «Todos los orígenes».</p>
      ) : null}
    </div>
  )
}
