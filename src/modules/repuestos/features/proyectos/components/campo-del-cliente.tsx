'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  BUSCANDO_EL_CLIENTE_DEL_VEHICULO,
  ETIQUETA_DEL_CLIENTE,
  NO_SE_TRAJO_EL_CLIENTE_DEL_VEHICULO,
  NUEVO_LEAD,
  TRAYENDO_EL_LEAD_CREADO,
  VINCULADO_AL_VEHICULO,
  type Elegido,
} from '../../../entities/proyectos/cliente-del-formulario'
import type { BuscadorDeProyecto } from './tipos-del-buscador'

// La clave de la URL donde «Nuevo lead» deja al creado (`?elegir=lead`) y el `data-elige` adonde vuelve el foco al cerrar el alta.
const CLAVE_PARA_ELEGIR = 'lead'

// Qué pasa con el campo, dicho debajo: lo que se está trayendo, de dónde salió el lead o por qué no llegó.
export type EstadoDelCampoDelCliente = {
  vinculado: boolean
  buscando: boolean
  sinTraer: boolean
  trayendo: boolean
  aviso: string | null
}

type Props = {
  valor: Elegido | null
  alElegir: (lead: Elegido | null) => void
  buscadorDeLead: BuscadorDeProyecto
  error?: string
  disabled: boolean
  // Nulo sin `leads.crear`: sólo se elige.
  alNuevoLead: (() => void) | null
  estado: EstadoDelCampoDelCliente
}

function textoDelEstado(valor: Elegido | null, estado: EstadoDelCampoDelCliente): string | null {
  if (estado.trayendo) return TRAYENDO_EL_LEAD_CREADO
  if (estado.buscando) return BUSCANDO_EL_CLIENTE_DEL_VEHICULO
  if (valor !== null) return estado.vinculado ? VINCULADO_AL_VEHICULO : null
  if (estado.aviso !== null) return estado.aviso
  return estado.sinTraer ? NO_SE_TRAJO_EL_CLIENTE_DEL_VEHICULO : null
}

// «Cliente (lead)» de «Nuevo proyecto» (con `leads.ver`), en los dos orígenes: el buscador de leads que compone `src/app` y, con el campo vacío y `leads.crear`,
// «Nuevo lead», que abre el alta del shell y vuelve con el creado elegido. Debajo, en una región que se anuncia, lo que se está trayendo o de dónde salió.
export function CampoDelCliente(p: Props) {
  const texto = textoDelEstado(p.valor, p.estado)
  return (
    <div className="grid gap-1.5">
      {p.buscadorDeLead({
        valor: p.valor,
        alElegir: p.alElegir,
        etiqueta: ETIQUETA_DEL_CLIENTE,
        error: p.error,
        disabled: p.disabled,
        elige: CLAVE_PARA_ELEGIR,
      })}
      {p.valor === null && p.alNuevoLead ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-fit md:min-h-9"
          disabled={p.disabled}
          onClick={p.alNuevoLead}
        >
          <PlusIcon aria-hidden />
          {NUEVO_LEAD}
        </Button>
      ) : null}
      <p aria-live="polite" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {texto}
      </p>
    </div>
  )
}
