'use client'

import { Button } from '@/shared/ui/button'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerTelefonosDelLead } from '../../../composicion.client'
import { TelefonosExtra } from '../../ficha/components/telefonos-extra'
import { NumeroDeTelefono } from '../../ficha/components/numero-de-telefono'
import { EsqueletoDelRapido } from './cuerpo-del-rapido'

const SIN_APERTURA = { abierto: false, abrir: () => undefined, cerrar: () => undefined }

type Props = {
  leadId: string
  // Cambia cuando se guardó el lead desde el panel de edición (el principal o los extras pudieron cambiar): se vuelve a leer.
  revision: number
}

// El teléfono del resumen del listado: el principal y los extras, sólo para leer (se editan con «Editar», en el panel). Los lee
// `lead_telefonos_leer()` al abrir la pestaña «Resumen» (el listado trae sólo el principal): enmascarados fuera de la cartera. Mientras
// lee, esqueleto; si falla, «Reintentar».
export function TelefonosDelResumen({ leadId, revision }: Props) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => leerTelefonosDelLead(leadId),
    `${leadId}|${String(revision)}`,
  )
  if (lectura.estado === 'leyendo') {
    return <EsqueletoDelRapido etiqueta="Cargando los teléfonos" />
  }
  if (lectura.estado === 'fallo' || lectura.dato === null) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los teléfonos.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  const lead = lectura.dato
  return (
    <>
      <ul className="grid gap-2">
        <li className="flex flex-wrap items-center gap-x-2">
          <NumeroDeTelefono
            numero={lead.telefono}
            codigoDePais={lead.telefonoCc}
            llamable={lead.enCartera}
          />
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Principal</span>
        </li>
        <TelefonosExtra
          lead={lead}
          puedeAdministrar={false}
          apertura={SIN_APERTURA}
          puedeConfigurar={false}
        />
      </ul>
      {lead.enCartera ? null : (
        <span className="mt-1 block text-(length:--text-xs) text-(--color-ink-soft)">
          Completo solo para su cartera.
        </span>
      )}
    </>
  )
}
