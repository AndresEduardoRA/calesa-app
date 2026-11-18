// Lo que la cabecera de `/repuestos/[id]` dice del vehículo cuando no es uno que se ve (el que se ve lo dibuja `vehiculos` y lo compone `src/app`): el proyecto externo,
// con lo escrito a mano, y el vehículo que quien mira no ve (D49: no existe, está en la papelera o no se ve se dicen igual). De servidor: no suman JS.

export const TEXTO_DE_PROYECTO_EXTERNO = 'Proyecto externo · sin vehículo'
export const TEXTO_DE_VEHICULO_QUE_NO_SE_VE = 'Vehículo que no puedes ver'

export function ProyectoExterno({
  etiqueta,
  vin,
}: {
  etiqueta: string | null
  vin: string | null
}) {
  return (
    <div data-proyecto-externo className="grid min-w-0 gap-1 text-(length:--text-sm)">
      <span className="font-medium">{TEXTO_DE_PROYECTO_EXTERNO}</span>
      {etiqueta ? <span className="[overflow-wrap:anywhere]">{etiqueta}</span> : null}
      {vin ? (
        <span className="[overflow-wrap:anywhere] text-(--color-ink-soft) tabular-nums">
          VIN {vin}
        </span>
      ) : null}
    </div>
  )
}

export function VehiculoQueNoSeVe() {
  return (
    <span className="text-(length:--text-sm) text-(--color-ink-soft)">
      {TEXTO_DE_VEHICULO_QUE_NO_SE_VE}
    </span>
  )
}
