import { Badge } from '@/shared/ui/badge'
import {
  estadoDeLaFormula,
  type EstadoDeLaFormula,
  type FormulaDeLaLista,
} from '../../../entities/formulas-del-origen/lista'

const VARIANTE: Record<EstadoDeLaFormula['tono'], 'default' | 'secondary' | 'outline'> = {
  activa: 'default',
  publicada: 'secondary',
  borrador: 'outline',
  archivada: 'outline',
}

// El estado de una fórmula del origen en un `<Badge>` (texto y color, nunca sólo color) y, si tiene borrador además de la publicada, ese detalle al lado.
export function EstadoDeLaFormula({
  formula,
}: {
  formula: Pick<FormulaDeLaLista, 'activa' | 'archivadaEn' | 'formula'>
}) {
  const estado = estadoDeLaFormula(formula)
  return (
    <>
      <Badge variant={VARIANTE[estado.tono]} data-estado-de-la-formula={estado.tono}>
        {estado.etiqueta}
      </Badge>
      {estado.detalle ? (
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">{estado.detalle}</span>
      ) : null}
    </>
  )
}
