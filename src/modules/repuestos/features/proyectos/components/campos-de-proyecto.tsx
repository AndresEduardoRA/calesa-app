'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { OrigenDelProyecto } from '../../../entities/proyectos/borrador'
import type {
  Elegido,
  EstadoDelFormulario,
} from '../../../entities/proyectos/cliente-del-formulario'
import { CampoDelCliente, type EstadoDelCampoDelCliente } from './campo-del-cliente'
import type { BuscadorDeProyecto } from './tipos-del-buscador'

type Texto = 'vehiculoEtiqueta' | 'vin' | 'clienteNombre' | 'clienteTelefono'

type Props = {
  valores: EstadoDelFormulario
  errores: Record<string, string>
  disabled: boolean
  // «Cliente (lead)» sólo con `leads.ver` (D44); sin ella, el cliente y el teléfono escritos a mano, sólo en el externo.
  puedeVerLeads: boolean
  avisoDelVehiculo: string | null
  escribir: (campo: Texto | 'notas', texto: string) => void
  elegirOrigen: (origen: OrigenDelProyecto) => void
  elegirVehiculo: (vehiculo: Elegido | null) => void
  elegirLead: (lead: Elegido | null) => void
  buscadorDeVehiculo: BuscadorDeProyecto
  buscadorDeLead: BuscadorDeProyecto
  alNuevoLead: (() => void) | null
  estadoDelCliente: EstadoDelCampoDelCliente
}

const ORIGENES: readonly { valor: OrigenDelProyecto; etiqueta: string }[] = [
  { valor: 'vehiculo', etiqueta: 'De un vehículo' },
  { valor: 'externo', etiqueta: 'Externo' },
]

function Origen({
  valor,
  disabled,
  alElegir,
}: {
  valor: OrigenDelProyecto
  disabled: boolean
  alElegir: (o: OrigenDelProyecto) => void
}) {
  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Origen del proyecto
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {ORIGENES.map((origen) => (
          <label key={origen.valor} className="flex min-h-11 items-center gap-2 md:min-h-9">
            <input
              type="radio"
              name="origen"
              value={origen.valor}
              checked={valor === origen.valor}
              onChange={() => {
                alElegir(origen.valor)
              }}
            />
            {origen.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Textos({
  campos,
  valores,
  errores,
  disabled,
  escribir,
}: Pick<Props, 'valores' | 'errores' | 'disabled' | 'escribir'> & {
  campos: readonly { campo: Texto; etiqueta: string; tel?: true }[]
}) {
  return campos.map(({ campo, etiqueta, tel }) => (
    <Campo
      key={campo}
      nombre={campo}
      etiqueta={etiqueta}
      type={tel ? 'tel' : undefined}
      value={valores[campo]}
      error={errores[campo]}
      disabled={disabled}
      onChange={(e) => {
        escribir(campo, e.target.value)
      }}
    />
  ))
}

const DEL_VEHICULO_EXTERNO = [
  { campo: 'vehiculoEtiqueta', etiqueta: 'Vehículo' },
  { campo: 'vin', etiqueta: 'VIN (opcional)' },
] as const
const CLIENTE_ESCRITO = [
  { campo: 'clienteNombre', etiqueta: 'Cliente (opcional)' },
  { campo: 'clienteTelefono', etiqueta: 'Teléfono del cliente (opcional)', tel: true },
] as const

function Cliente(p: Props) {
  return (
    <CampoDelCliente
      valor={
        p.valores.leadId === '' ? null : { id: p.valores.leadId, titulo: p.valores.leadTitulo }
      }
      alElegir={p.elegirLead}
      buscadorDeLead={p.buscadorDeLead}
      error={p.errores['leadId']}
      disabled={p.disabled}
      alNuevoLead={p.alNuevoLead}
      estado={p.estadoDelCliente}
    />
  )
}

function Notas({
  valor,
  error,
  disabled,
  alEscribir,
}: {
  valor: string
  error?: string
  disabled: boolean
  alEscribir: (texto: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="notas">Notas (opcional)</Label>
      <Textarea
        id="notas"
        name="notas"
        value={valor}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onChange={(e) => {
          alEscribir(e.target.value)
        }}
      />
      {error ? <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error}</p> : null}
    </div>
  )
}

// Los campos de «Nuevo proyecto» (8.09-1, C9). De un vehículo: el buscador (sus datos salen del vehículo). Externo: la etiqueta y el VIN. El cliente, con `leads.ver`, es
// «Cliente (lead)» en los dos (en «De un vehículo», el vinculado al vehículo por defecto); sin ella, el cliente y el teléfono escritos, sólo en el externo. Las notas van en los dos.
export function CamposDeProyecto(p: Props) {
  const { valores, errores, disabled } = p
  return (
    <>
      <Origen valor={valores.origen} disabled={disabled} alElegir={p.elegirOrigen} />
      {p.avisoDelVehiculo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{p.avisoDelVehiculo}</p>
      ) : null}
      {valores.origen === 'vehiculo' ? (
        p.buscadorDeVehiculo({
          valor:
            valores.vehiculoId === ''
              ? null
              : { id: valores.vehiculoId, titulo: valores.vehiculoTitulo },
          alElegir: p.elegirVehiculo,
          etiqueta: 'Vehículo',
          error: errores['vehiculoId'],
          disabled,
        })
      ) : (
        <Textos campos={DEL_VEHICULO_EXTERNO} {...p} />
      )}
      {p.puedeVerLeads ? (
        <Cliente {...p} />
      ) : valores.origen === 'externo' ? (
        <Textos campos={CLIENTE_ESCRITO} {...p} />
      ) : null}
      <Notas
        valor={valores.notas}
        error={errores['notas']}
        disabled={disabled}
        alEscribir={(notas) => {
          p.escribir('notas', notas)
        }}
      />
    </>
  )
}
