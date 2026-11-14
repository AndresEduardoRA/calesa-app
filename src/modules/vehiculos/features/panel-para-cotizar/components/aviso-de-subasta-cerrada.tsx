'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { hrefDePanel, type AccionDelAviso } from '@/shared/lib/acciones-del-aviso'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { pedidoParaResolver } from '../../../entities/situacion'
import {
  resolverDelAviso,
  situacionDelAviso,
  type DatosDelAviso,
} from '../../../entities/subasta-cerrada'
import { BotonesDeSituacion } from '../../situacion/components/botones-de-situacion'
import { useNoGanada } from '../../situacion/hooks/use-no-ganada'
import { FechaDeSubasta } from '../../subasta/components/fecha-de-subasta'
import { CLAVE_DE_LISTA, PANEL_DEL_VEHICULO } from '../claves'
import { CLASE_DE_BOTON, RefrescarDelAviso } from './refrescar-del-aviso'

type Props = {
  datos: DatosDelAviso
  // «La ganamos» abre el mover de logística en su modo (`?ganada=si`): lo arma `src/app` (`vehiculos` no conoce `logistica`).
  hrefLaGanamos: string
}

// «Elegir otro vehículo» abre el panel del vehículo en «Cierre subasta», la lista de lo que todavía se puede ganar.
const ELEGIR_OTRO: Extract<AccionDelAviso, { tipo: 'panel' }> = {
  tipo: 'panel',
  etiqueta: 'Elegir otro vehículo',
  panel: PANEL_DEL_VEHICULO,
  valores: { [CLAVE_DE_LISTA]: 'cierre' },
}

// El aviso de la hoja de cotizar cuando la subasta del vehículo elegido ya cerró: dice cuándo y en qué situación quedó y da salida (refrescar, resolver,
// elegir otro, cotizar igual). Es información con salida, no una barrera: no frena guardar. «Cotizar igual» lo cierra para esta hoja; su estado no
// sobrevive a cambiar de vehículo (la página lo monta con `key`).
export function AvisoDeSubastaCerrada({ datos, hrefLaGanamos }: Props) {
  const router = useRouter()
  const [cerrado, setCerrado] = useState(false)
  const { marcar, enviando, conflicto, error } = useNoGanada({
    vehiculoId: datos.vehiculoId,
    origenId: datos.origenId,
  })
  if (cerrado) {
    return null
  }
  const situacion = situacionDelAviso(datos.situacion)
  const resolver = resolverDelAviso({ situacion: datos.situacion, puede: datos.puedeResolver })
  const sinPermisoParaResolver = datos.situacion === 'sin_resolver' && !datos.puedeResolver
  return (
    <Aviso tono="aviso">
      <section aria-label="Subasta cerrada" className="grid gap-2" data-aviso="subasta-cerrada">
        <p>
          {datos.cierre ? (
            <>
              La subasta de este vehículo cerró el{' '}
              <FechaDeSubasta iso={datos.cierre} estadoDelPatio={datos.estadoDelPatio} detalle />.
            </>
          ) : (
            'La subasta de este vehículo ya cerró.'
          )}
          {situacion ? ` Situación: ${situacion}.` : ''}
        </p>
        {sinPermisoParaResolver ? <p>{pedidoParaResolver(datos.nombreDelOrigen)}</p> : null}
        {conflicto ? <p role="alert">{conflicto} No se cambió nada.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="flex flex-wrap items-start gap-2">
          {datos.puedeRefrescar ? <RefrescarDelAviso datos={datos} /> : null}
          <BotonesDeSituacion
            acciones={resolver}
            hrefLaGanamos={hrefLaGanamos}
            enviando={enviando}
            alMarcar={(noGanada) => {
              void marcar(noGanada).then(() => {
                router.refresh()
              })
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={CLASE_DE_BOTON}
            onClick={() => {
              salirSinPerder(() => {
                router.push(
                  hrefDePanel(
                    ELEGIR_OTRO,
                    window.location.pathname,
                    window.location.search,
                  ) as Route,
                )
              })
            }}
          >
            {ELEGIR_OTRO.etiqueta}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={CLASE_DE_BOTON}
            onClick={() => {
              setCerrado(true)
            }}
          >
            Cotizar igual
          </Button>
        </div>
      </section>
    </Aviso>
  )
}
