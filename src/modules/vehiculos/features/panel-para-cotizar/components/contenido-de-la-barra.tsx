import type { ReactNode } from 'react'
import { referenciaDelVehiculo, type VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'

export const SIN_VER = 'No puedes ver los vehículos de este origen.'

// Una etiqueta propia y no `<Badge>`: éste arrastra Base UI a la carga en frío de la hoja (≈ 9 KB, medido en el 4.14-2b).
const ETIQUETA =
  'inline-flex h-5 shrink-0 items-center rounded-4xl px-2 text-xs font-medium whitespace-nowrap'

// El título grande en dos líneas como mucho, completo en `title` (al 200 % y en el celular no desborda).
const GRANDE = 'line-clamp-2 font-medium break-words text-(--color-ink)'
const DEBAJO = 'text-(length:--text-xs) text-(--color-ink-soft)'

type Props = {
  elegido: VehiculoElegido | null
  puedeVer: boolean
  cotizado: string | null
  obligatorio: boolean
  // `undefined`: la barra sólo nombra el vehículo; null: todavía no hay título.
  titulo: string | null | undefined
  // `undefined`: «Selecciona un vehículo».
  textoSinVehiculo: string | null | undefined
}

function ConElegido({
  elegido,
  titulo,
  cotizado,
}: {
  elegido: VehiculoElegido
  titulo: string | null
  cotizado: string | null
}) {
  // Debajo del título, el vehículo: su título si no es el mismo, y su referencia.
  const debajo = [titulo === elegido.titulo ? null : elegido.titulo, referenciaDelVehiculo(elegido)]
    .filter((t) => t !== null)
    .join(' · ')
  return (
    <>
      <span className="grid min-w-0 flex-1">
        {titulo === null ? (
          <>
            <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
            <span className={`${DEBAJO} tabular-nums`}>{referenciaDelVehiculo(elegido)}</span>
          </>
        ) : (
          <>
            <span className={GRANDE} title={titulo}>
              {titulo}
            </span>
            <span className={`${DEBAJO} truncate tabular-nums`}>{debajo}</span>
          </>
        )}
      </span>
      {cotizado === null ? null : (
        <span className={`${ETIQUETA} bg-(--color-surface-3) text-(--color-ink)`}>
          Cotizado ({cotizado})
        </span>
      )}
    </>
  )
}

function SinElegido({
  titulo,
  texto,
  etiqueta,
}: {
  titulo: string | null
  texto: string | null
  etiqueta: ReactNode
}) {
  return (
    <>
      {titulo === null ? (
        <span className="flex-1 text-(--color-ink-soft)">{texto}</span>
      ) : (
        <span className="grid min-w-0 flex-1">
          <span className={GRANDE} title={titulo}>
            {titulo}
          </span>
          {texto === null ? null : <span className={DEBAJO}>{texto}</span>}
        </span>
      )}
      {etiqueta}
    </>
  )
}

// Lo que dice la barra del vehículo (botón o no): con título, el título grande y debajo el vehículo; sin vehículo, el título solo con «Selecciona un vehículo»
// debajo; sin ninguno de los dos, «Selecciona un vehículo» como siempre.
export function ContenidoDeLaBarra(props: Props) {
  const { elegido, puedeVer, cotizado, obligatorio, titulo, textoSinVehiculo } = props
  const conTitulo = titulo ?? null
  return (
    <>
      <Miniatura ruta={elegido?.portadaRuta} className="w-12" />
      {/* La barra abre el panel «Vehículo»: su nombre empieza así siempre, con o sin título. */}
      <span className="sr-only">Vehículo: </span>
      {elegido ? (
        <ConElegido elegido={elegido} titulo={conTitulo} cotizado={cotizado} />
      ) : (
        <SinElegido
          titulo={conTitulo}
          texto={
            puedeVer
              ? textoSinVehiculo === undefined
                ? 'Selecciona un vehículo'
                : textoSinVehiculo
              : SIN_VER
          }
          etiqueta={
            obligatorio && puedeVer ? (
              // En su propio `<span>`: «Selecciona un vehículo» no se parte.
              <span className={`${ETIQUETA} bg-(--color-peligro-soft) text-(--color-peligro-ink)`}>
                Obligatorio
              </span>
            ) : null
          }
        />
      )}
    </>
  )
}
