// El campo «Cliente (lead)» de «Nuevo proyecto» (glosario: «Cliente (de un proyecto)»), dicho como transiciones puras del estado del formulario. En «De un vehículo»
// se propone el lead vinculado al vehículo mientras la persona no haya tocado el campo; cambiar o quitar el vehículo, o pasar a «Externo», sólo quita ese lead
// propuesto, nunca uno elegido. El propuesto no cuenta como escrito: no va al borrador ni pide confirmar al salir (`baseDelBorrador`).
import {
  BORRADOR_NUEVO_DE_PROYECTO,
  type BorradorDeProyecto,
  type OrigenDelProyecto,
} from './borrador'

// Lo que el formulario guarda además del borrador: cómo se llama lo elegido en cada buscador (sólo el id va a la base), si el lead es el que se propuso por
// el vehículo y si la persona ya tocó el campo (eligió, creó o vació un lead).
export type EstadoDelFormulario = BorradorDeProyecto & {
  vehiculoTitulo: string
  leadTitulo: string
  leadDelVehiculo: boolean
  leadTocado: boolean
}

export type Elegido = { id: string; titulo: string }

export const FORMULARIO_VACIO: EstadoDelFormulario = {
  ...BORRADOR_NUEVO_DE_PROYECTO,
  vehiculoTitulo: '',
  leadTitulo: '',
  leadDelVehiculo: false,
  leadTocado: false,
}

export const ETIQUETA_DEL_CLIENTE = 'Cliente (lead)'
export const NUEVO_LEAD = 'Nuevo lead'
export const VINCULADO_AL_VEHICULO = 'Vinculado al vehículo'
export const BUSCANDO_EL_CLIENTE_DEL_VEHICULO = 'Buscando el cliente del vehículo…'
export const NO_SE_TRAJO_EL_CLIENTE_DEL_VEHICULO =
  'No pudimos traer el cliente del vehículo. Búscalo aquí.'
export const TRAYENDO_EL_LEAD_CREADO = 'Trayendo el lead que creaste…'

const SIN_LEAD = { leadId: '', leadTitulo: '', leadDelVehiculo: false } as const

// Quita el lead si es el propuesto por el vehículo; uno elegido queda.
function sinElPropuesto(estado: EstadoDelFormulario): EstadoDelFormulario {
  return estado.leadDelVehiculo ? { ...estado, ...SIN_LEAD } : estado
}

/** Elegir, cambiar o quitar el vehículo. */
export function conVehiculo(
  estado: EstadoDelFormulario,
  vehiculo: Elegido | null,
): EstadoDelFormulario {
  return sinElPropuesto({
    ...estado,
    vehiculoId: vehiculo?.id ?? '',
    vehiculoTitulo: vehiculo?.titulo ?? '',
  })
}

/** Pasar de «De un vehículo» a «Externo» o al revés. */
export function conOrigen(
  estado: EstadoDelFormulario,
  origen: OrigenDelProyecto,
): EstadoDelFormulario {
  const cambiado = { ...estado, origen }
  return origen === 'externo' ? sinElPropuesto(cambiado) : cambiado
}

/** La persona elige, crea o vacía el lead: desde ahí el campo es suyo y el vehículo ya no propone. */
export function conLead(estado: EstadoDelFormulario, lead: Elegido | null): EstadoDelFormulario {
  return {
    ...estado,
    leadId: lead?.id ?? '',
    leadTitulo: lead?.titulo ?? '',
    leadDelVehiculo: false,
    leadTocado: true,
  }
}

/**
 * Llega el lead vinculado a `vehiculoId` (nulo: no tiene o quien mira no lo ve). Se pone sólo si el campo no se tocó y el formulario sigue en ese vehículo:
 * la respuesta de un vehículo anterior se ignora.
 */
export function conLeadDelVehiculo(
  estado: EstadoDelFormulario,
  vehiculoId: string,
  lead: Elegido | null,
): EstadoDelFormulario {
  if (estado.leadTocado || estado.origen !== 'vehiculo' || estado.vehiculoId !== vehiculoId) {
    return estado
  }
  if (lead === null) {
    return sinElPropuesto(estado)
  }
  return { ...estado, leadId: lead.id, leadTitulo: lead.titulo, leadDelVehiculo: true }
}

/** Contra qué se mide lo escrito (borrador y «cambios sin guardar»): lo inicial, con el lead propuesto por el vehículo como si viniera de fábrica. */
export function baseDelBorrador(
  inicial: EstadoDelFormulario,
  valores: EstadoDelFormulario,
): EstadoDelFormulario {
  if (!valores.leadDelVehiculo) {
    return inicial
  }
  return {
    ...inicial,
    leadId: valores.leadId,
    leadTitulo: valores.leadTitulo,
    leadDelVehiculo: true,
  }
}
