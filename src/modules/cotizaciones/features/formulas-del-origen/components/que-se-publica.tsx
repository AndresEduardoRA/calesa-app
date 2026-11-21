'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { loQueSePublica } from '../../../entities/formulas-del-origen/activar'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'

function LineaDeLaPieza({
  titulo,
  publica,
  version,
  guardado,
}: {
  titulo: string
  publica: boolean
  version: number
  guardado: string | null
}) {
  const { zonaHoraria } = useRegional()
  const texto = publica
    ? `Su borrador${guardado ? `, guardado ${fechaRelativa(guardado, { zona: zonaHoraria })},` : ''} se publica como la versión ${String(version)}.`
    : `Sin borrador: se cotiza con la versión ${String(version)}.`
  return (
    <li>
      <span className="font-medium text-(--color-ink)">{titulo}:</span> {texto}
    </li>
  )
}

// «Qué se publica» al activar una fórmula: el borrador de la planilla y el de la tarjeta, con la versión que toman. Lo dibujan el modal de activar y el paso
// «Publicar» de la puesta en marcha.
export function QueSePublica({ formula }: { formula: FormulaDeLaLista }) {
  const [planilla, tarjeta] = loQueSePublica(formula)
  return (
    <section className="grid gap-1 text-(length:--text-sm)">
      <h3 className="font-semibold text-(--color-ink)">Qué se publica</h3>
      <ul className="grid gap-1 text-(--color-ink-soft)">
        {planilla ? (
          <LineaDeLaPieza
            titulo="La planilla"
            {...planilla}
            guardado={formula.formula.borrador?.actualizadoEn ?? null}
          />
        ) : null}
        {tarjeta ? (
          <LineaDeLaPieza
            titulo="La tarjeta"
            {...tarjeta}
            guardado={formula.tarjeta.borrador?.actualizadoEn ?? null}
          />
        ) : null}
      </ul>
    </section>
  )
}
