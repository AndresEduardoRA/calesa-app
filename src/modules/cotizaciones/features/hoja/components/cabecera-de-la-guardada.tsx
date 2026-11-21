'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useContext, type ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { CadenaDeLaCotizacion } from '../../../entities/hoja-de-una-guardada'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { InsigniaPrivada } from '../../privada/components/insignia-privada'
import { RevisionesDeLaCotizacion } from '../../revisiones/components/revisiones-de-la-cotizacion'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { ContextoDeLaRanura } from './menu-de-la-guardada/contexto'
import { MenuDeLaGuardada } from './menu-de-la-guardada/menu-de-la-guardada'

type Props = {
  id: string
  numero: number
  clase: keyof typeof ETIQUETA_DE_CLASE
  // Su `actualizadoEn` (el texto de la base): las revisiones leídas son de una versión de la fila.
  actualizadoEn: string
  // Su versión en la cadena (1, 2…) y lo que quien mira ve de ella: la anterior y la versión nueva (P4, P11).
  version: number
  cadena: CadenaDeLaCotizacion
  // El último día en que vale, `YYYY-MM-DD` de la zona de la empresa, y si ya pasó.
  venceEl: string
  vencida: boolean
  origen: string
  // Lo que quien mira ve del cliente y del vehículo: el que no se ve no se nombra.
  cliente: string | null
  vehiculo: string | null
  // La barra del vehículo con el título de la cotización (T307), ya armada por la página (`vehiculos` y `cotizaciones` no se conocen): reemplaza «Vehículo: X».
  barra?: ReactNode
  // Si quien mira la puede guardar (`puede_guardar` de la base): sólo así va el lugar de «Guardar».
  guardable: boolean
  // Lo que las áreas suman al «⋯» (4.15-6b): sus líneas y sus diálogos, ya dibujados por la página; no dibujan nada a la vista.
  acciones?: ReactNode
  // Lo que un área suma después de la clase y de la vigencia (4.27-4): sus insignias, ya dibujadas por la página.
  insignias?: ReactNode
  // Si es privada (glosario: «Cotización privada»): su insignia va tras la vigencia, antes de las de las áreas.
  privada?: boolean
}

// La cabecera de una cotización guardada: «Cotización n.º N», su clase, hasta cuándo vale (o «Vencida»), las insignias de las áreas («Aprobar» o «Aprobada», «Reportada»…),
// lo principal a la vista («Guardar», que el resumen dibuja aquí por un portal, y «Compartir», del hueco de la vista previa) y lo demás en el «⋯» (`docs/UX.md` › «Cotización
// guardada»); debajo, la cadena de versiones, de qué origen y cliente es y, en la barra, su título y su vehículo. En el celular el «⋯» queda en la fila del título y «Guardar» y
// «Compartir» van debajo, mitad y mitad; desde `md`, todo en una fila con el «⋯» al final. El número es un identificador: va sin separador de miles. La fecha se muestra en la
// zona de la empresa.
export function CabeceraDeLaGuardada({
  id,
  numero,
  clase,
  actualizadoEn,
  version,
  cadena,
  venceEl,
  vencida,
  origen,
  cliente,
  vehiculo,
  barra,
  guardable,
  acciones,
  insignias,
  privada = false,
}: Props) {
  const { zonaHoraria } = useRegional()
  const compartir = useContext(ContextoDeLaVistaPrevia)?.compartir?.()
  const ponerRanura = useContext(ContextoDeLaRanura)
  return (
    <header data-cabecera-de-la-guardada="" className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-(length:--text-xl) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
          Cotización n.º {String(numero)}
        </h1>
        <Badge variant="secondary">{ETIQUETA_DE_CLASE[clase]}</Badge>
        {vencida ? (
          <Badge variant="destructive">Vencida</Badge>
        ) : (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            Vale hasta el {formatearFecha(venceEl, { zona: zonaHoraria })}
          </span>
        )}
        {privada ? <InsigniaPrivada /> : null}
        {insignias}
        <div className="ml-auto md:order-last md:ml-0">
          <MenuDeLaGuardada cotizacionId={id} numero={numero} />
        </div>
        <div
          data-acciones-de-la-cabecera=""
          className="grid w-full auto-cols-fr grid-flow-col items-start gap-2 empty:hidden md:ml-auto md:flex md:w-auto"
        >
          {guardable && ponerRanura !== null ? (
            <div ref={ponerRanura} className="grid min-h-11 md:min-h-8" />
          ) : null}
          {compartir}
        </div>
      </div>
      <RevisionesDeLaCotizacion cotizacionId={id} numero={numero} version={actualizadoEn} />
      {acciones}
      <CadenaDeVersiones version={version} cadena={cadena} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
        <span>{origen}</span>
        {cliente === null ? null : <span>Cliente: {cliente}</span>}
        {vehiculo === null || barra !== undefined ? null : <span>Vehículo: {vehiculo}</span>}
      </p>
      {barra}
    </header>
  )
}

const ENLACE = 'underline-offset-2 hover:underline'

// Dónde está esta cotización en su cadena (cotizar encima): de cuál viene y si ya tiene una versión nueva. Quien no ve la anterior ve «Versión N» sin enlace; quien no ve la nueva,
// que existe. Sin anterior, en la versión 1 y sin nueva, no hay nada que decir.
function CadenaDeVersiones({ version, cadena }: { version: number; cadena: CadenaDeLaCotizacion }) {
  const { anterior, encima } = cadena
  if (anterior === null && version === 1 && encima === null) {
    return null
  }
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
      {anterior === null ? (
        version > 1 ? (
          <span>Versión {version}</span>
        ) : null
      ) : (
        <Link href={rutaDeLaCotizacion(anterior.id) as Route} className={ENLACE}>
          Versión {version} de la n.º {anterior.numero}
        </Link>
      )}
      {encima === null ? null : 'oculta' in encima ? (
        <span>Hay una versión nueva que no puedes ver.</span>
      ) : (
        <span>
          Hay una versión nueva:{' '}
          <Link href={rutaDeLaCotizacion(encima.id) as Route} className={ENLACE}>
            n.º {encima.numero} (versión {encima.version})
          </Link>
          .
        </span>
      )}
    </p>
  )
}
