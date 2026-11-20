import {
  AlarmClockIcon,
  CalendarOffIcon,
  CircleAlertIcon,
  CircleXIcon,
  TrophyIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
import { Monto } from '@/shared/ui/monto'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  cierreDeLaSubasta,
  etiquetaDeLaPuja,
  fraseDeSubasta,
  type IconoDeLaFrase,
  type TonoDeLaFrase,
} from '../../../entities/frase-de-subasta'
import type { Situacion } from '../../../entities/situacion'
import type { SubastaDeVehiculo } from '../../../entities/subasta-vehiculo'
import { estaDesactualizada } from '../../../entities/subasta-tiempo'
import { CLAVE_DEL_ESTADO_DEL_PATIO } from '../../../entities/zona-del-patio'
import { CuentaRegresivaDelCierre } from './cuenta-regresiva-del-cierre'
import { FechaDeSubasta } from './fecha-de-subasta'
import { MenuDeLaSubasta } from './menu-de-la-subasta'

type Props = {
  vehiculo: Pick<Vehiculo, 'id' | 'actualizadoEn' | 'atributos'>
  // La situación real (la calcula la base): la frase la nombra.
  situacion: Situacion
  subasta: SubastaDeVehiculo
  // Cuándo es «ahora» (ISO): lo fija quien lo pone, así la cuenta no depende del reloj de cada render.
  ahora: string
  zona: string
  // apibara está encendida y quien mira puede editar el vehículo: el aviso de la subasta vieja apunta a «Actualizar los datos».
  puedeRefrescar: boolean
  // Quien mira puede editar el vehículo: el «⋯» con «Editar fechas».
  puedeEditar: boolean
  // El origen tiene activo el campo de apibara con el «Buy it now» (`pricing.buy_now_usd`): sin él, no hay «Compra directa».
  conCompraDirecta: boolean
}

const COLOR_DEL_TONO: Record<TonoDeLaFrase, string> = {
  info: 'text-(--color-info-ink)',
  aviso: 'text-(--color-aviso-ink)',
  exito: 'text-(--color-positivo-ink)',
  apagado: 'text-(--color-ink-soft)',
  neutro: 'text-(--color-ink)',
}

const ICONO: Record<IconoDeLaFrase, LucideIcon> = {
  reloj: AlarmClockIcon,
  alerta: CircleAlertIcon,
  ganada: TrophyIcon,
  no_ganada: CircleXIcon,
  calendario: CalendarOffIcon,
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) text-(--color-ink)">{children}</dd>
    </div>
  )
}

// La puja (actual o final) y la compra directa, en dólares (así las publica la plataforma) y con <Monto>. Una cifra que no hay no se dibuja.
function Cifras({
  subasta,
  etiquetaDePuja,
  conCompraDirecta,
  consultada,
}: {
  subasta: SubastaDeVehiculo
  etiquetaDePuja: string
  conCompraDirecta: boolean
  consultada: string | null
}) {
  const compra = conCompraDirecta ? subasta.compraInmediata : null
  if (subasta.pujaActual === null && compra === null) return null
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-x-4 gap-y-3">
      {subasta.pujaActual !== null ? (
        <Dato etiqueta={etiquetaDePuja}>
          <span className="text-(length:--text-base) font-semibold tabular-nums">
            <Monto valor={subasta.pujaActual} moneda="USD" />
          </span>
          {consultada === null ? null : (
            <span className="block text-(length:--text-xs) text-(--color-ink-soft)">
              consultada {consultada}
            </span>
          )}
        </Dato>
      ) : null}
      {compra !== null ? (
        <Dato etiqueta="Compra directa">
          <span className="text-(length:--text-base) font-semibold tabular-nums">
            <Monto valor={compra} moneda="USD" />
          </span>
        </Dato>
      ) : null}
    </dl>
  )
}

// El cierre en la zona de quien mira y, con `cuenta` (el «ahora» del servidor), la cuenta regresiva viva debajo; sin fecha lo dice.
function DelCierre({
  cierre,
  estadoDelPatio,
  cuenta,
}: {
  cierre: string | null
  estadoDelPatio: unknown
  cuenta: string | null
}) {
  if (cierre === null) return 'Sin fecha de cierre'
  return (
    <>
      <FechaDeSubasta iso={cierre} estadoDelPatio={estadoDelPatio} detalle />
      {cuenta === null ? null : (
        <CuentaRegresivaDelCierre
          cierre={cierre}
          ahora={cuenta}
          className="mt-0.5 text-(length:--text-sm)"
        />
      )}
    </>
  )
}

// «Subasta» en la columna izquierda de la ficha, fácil de leer: una frase con color y cuenta según la situación («Se subasta en 2 días 4 h», «Cerró
// hace 3 h · sin resolver», «Ganada», «No ganada»), el cierre en la zona de quien mira (y, más chicas, la del patio y la de la empresa), la puja y la
// compra directa. «Editar fechas» va en su «⋯»; consultar de nuevo es «Actualizar los datos» del «⋯» del vehículo.
export function BloqueDeSubasta({
  vehiculo,
  situacion,
  subasta,
  ahora,
  zona,
  puedeRefrescar,
  puedeEditar,
  conCompraDirecta,
}: Props) {
  const instante = new Date(ahora)
  const fechas = { subastaEn: subasta.subastaEn, subastaFinEn: subasta.subastaFinEn }
  const cierre = cierreDeLaSubasta(fechas)
  const frase = fraseDeSubasta({ situacion, ...fechas, ahora: instante })
  const Icono = ICONO[frase.icono]
  const vieja = estaDesactualizada(subasta.estado, subasta.subastaEn, instante)
  const idDelTitulo = `${vehiculo.id}-subasta-titulo`
  return (
    <section aria-labelledby={idDelTitulo} className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 id={idDelTitulo} tabIndex={-1} className={TITULO_DE_BLOQUE}>
          Subasta
        </h2>
        {puedeEditar ? (
          <MenuDeLaSubasta
            vehiculoId={vehiculo.id}
            actualizadoEn={vehiculo.actualizadoEn}
            fechas={fechas}
            ahora={ahora}
          />
        ) : null}
      </div>
      <p
        data-frase-de-subasta={frase.tono}
        className={cn(
          'flex min-w-0 items-start gap-2 text-(length:--text-lg) font-semibold',
          COLOR_DEL_TONO[frase.tono],
        )}
      >
        <Icono aria-hidden className="mt-1 size-5 shrink-0" />
        <span className="min-w-0 break-words">{frase.texto}</span>
      </p>
      <dl className="grid gap-3">
        <Dato etiqueta="Cierre">
          <DelCierre
            cierre={cierre}
            estadoDelPatio={vehiculo.atributos[CLAVE_DEL_ESTADO_DEL_PATIO]}
            cuenta={situacion === 'en_subasta' ? ahora : null}
          />
        </Dato>
      </dl>
      <Cifras
        subasta={subasta}
        etiquetaDePuja={etiquetaDeLaPuja(situacion, fechas, instante)}
        conCompraDirecta={conCompraDirecta}
        consultada={
          subasta.sincronizadoEn === null
            ? null
            : fechaRelativa(subasta.sincronizadoEn, { zona, ahora: instante })
        }
      />
      {vieja ? (
        <Aviso tono="aviso">
          La subasta ya debía haber empezado. Lo que ves puede estar viejo.
          {puedeRefrescar
            ? ' Usa «Actualizar los datos» del «⋯» del vehículo para ver cómo terminó.'
            : ''}
        </Aviso>
      ) : null}
    </section>
  )
}
