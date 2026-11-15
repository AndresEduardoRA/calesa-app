'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DE_VINCULOS,
  nombreDeLead,
  type Vinculo,
  type VinculosDelVehiculo,
} from '../../../entities/vinculo'

type Props = { vinculos: VinculosDelVehiculo }

const DETALLE = 'text-(length:--text-xs) text-(--color-ink-soft)'

// «Ana Quispe · N.º 1.234» (o «· Tu n.º 12»): el número que quien mira ve, y nada si no ve ninguno.
function Lead({ nombre, numeros }: { nombre: string; numeros: NumerosDeLead }) {
  const hayNumero = numeros.numero !== null || numeros.numeroPropio !== null
  return (
    <span className="font-medium text-(--color-ink)">
      {nombre}
      {hayNumero ? (
        <span className="font-normal text-(--color-ink-soft) tabular-nums">
          {' · '}
          <NumeroDeLead numeros={numeros} className="" />
        </span>
      ) : null}
    </span>
  )
}

function Periodo({ vinculo, zona }: { vinculo: Vinculo; zona: string }) {
  const desde = formatearFecha(vinculo.desde, { zona })
  const cuando = vinculo.hasta
    ? `Del ${desde} al ${formatearFecha(vinculo.hasta, { zona })}`
    : `Desde el ${desde}`
  return (
    <span className={DETALLE}>
      {cuando}
      {vinculo.porNombre ? ` · lo vinculó ${vinculo.porNombre}` : null}
    </span>
  )
}

// El vínculo vigente de un vehículo y los que ya se cerraron, con desde cuándo y quién los hizo: el «Ver todos» de Vinculado. El nombre de un lead aparece únicamente si quien mira lo
// ve. Vincular y desvincular se hacen desde las acciones del bloque «Relacionados».
export function VinculoEHistorial({ vinculos }: Props) {
  const { zonaHoraria: zona } = useRegional()
  const { vinculo, historial } = vinculos
  return (
    <div className="grid gap-3 text-(length:--text-sm)">
      <section aria-label="Vínculo" className="grid gap-1">
        {vinculo ? (
          <p className="grid gap-0.5">
            <Lead nombre={nombreDeLead(vinculo)} numeros={vinculo.leadNumeros} />
            <Periodo vinculo={vinculo} zona={zona} />
          </p>
        ) : (
          <p className="text-(--color-ink-soft)">
            Sin vínculo: ningún lead es dueño ni comprador de este vehículo.
          </p>
        )}
      </section>
      {historial.length > 0 ? (
        <ul aria-label="Vínculos anteriores" className="grid gap-2">
          {historial.map((anterior) => (
            <li key={`${anterior.leadId}-${anterior.desde}`} className="grid gap-0.5">
              <Lead nombre={nombreDeLead(anterior)} numeros={anterior.leadNumeros} />
              <Periodo vinculo={anterior} zona={zona} />
            </li>
          ))}
        </ul>
      ) : null}
      {vinculos.historialHayMas ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_VINCULOS, { sustantivo: 'vínculos' })} />
      ) : null}
    </div>
  )
}
