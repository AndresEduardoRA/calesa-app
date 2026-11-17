'use client'

import { Dato, DatosPorGrupo } from '@/shared/ui/campos'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'
import { OrigenDelLead } from '../../listado/components/origen-del-lead'

type Props = {
  ficha: LeadDeFicha
  // Los campos activos del layout (los desactivados no se muestran).
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
}

const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// «Datos» de la ficha, a la vista y sin plegar: tipo, origen y alta, y los campos del layout por grupo (un `h3` por grupo), como los
// definió la empresa. Un «solo la cartera» de un lead que no es de la cartera de quien mira nunca llega: se dice, en vez de un guion que
// haría creer que no hay dato (igual que en el listado).
export function DatosDeLaFicha({ ficha, campos, origen, tipo }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <section aria-labelledby="datos-de-la-ficha" className="grid min-w-0 gap-3">
      <h2 id="datos-de-la-ficha" className={TITULO_DE_BLOQUE}>
        Datos
      </h2>
      <dl className={REJILLA}>
        <Dato etiqueta="Tipo">
          <BadgeDeTipo tipo={tipo} />
        </Dato>
        <Dato etiqueta="Origen del lead">
          {origen ? (
            <OrigenDelLead nombre={origen.nombre} icono={origen.icono} activo={origen.activo} />
          ) : (
            '—'
          )}
        </Dato>
        <Dato etiqueta="Creado">{formatearFechaHora(ficha.creadoEn, { zona: zonaHoraria })}</Dato>
      </dl>
      <DatosPorGrupo
        campos={campos}
        atributos={ficha.atributos}
        plegable={false}
        valorDe={(campo) =>
          ficha.atributos[campo.clave] === undefined && campo.soloCartera && !ficha.enCartera ? (
            <span className="text-(length:--text-xs) text-(--color-ink-faint)">
              Solo la cartera
            </span>
          ) : null
        }
      />
    </section>
  )
}
