// Cambiar el vehículo de una cotización guardada desde su detalle (T315; `docs/COTIZADOR.md` › «La hoja de una guardada y cotizar encima»). Puro: lo usan la página
// (`src/app`, en el servidor) y la lectura de la hoja. Se decide con `puede_guardar` de la base y la clase, nunca con el rol: la base vuelve a decidir al calcular y al guardar.

// Qué permite la barra del vehículo de una guardada: elegir otro (`elige`: una preventa que quien mira puede guardar), mostrar por qué no (`final`: una final que puede
// guardar) o sólo mostrar (`no`: quien sólo la ve).
export type CambioPermitido = 'elige' | 'final' | 'no'

export const MOTIVO_DE_LA_FINAL = 'Una cotización final no cambia de vehículo.'

export function cambioDeVehiculo({
  clase,
  puedeGuardar,
}: {
  clase: 'preventa' | 'final'
  puedeGuardar: boolean
}): CambioPermitido {
  if (!puedeGuardar) {
    return 'no'
  }
  return clase === 'final' ? 'final' : 'elige'
}

// El vehículo con que se calcula la hoja de una guardada: el pedido en la URL sólo si quien mira puede elegirlo y es otro que el guardado; si no, nulo (el suyo).
export function vehiculoParaCalcular(
  cotizacion: { clase: 'preventa' | 'final'; vehiculoId: string | null },
  puedeGuardar: boolean,
  candidato: string | null,
): string | null {
  if (
    candidato === null ||
    cambioDeVehiculo({ clase: cotizacion.clase, puedeGuardar }) !== 'elige'
  ) {
    return null
  }
  return candidato.toLowerCase() === cotizacion.vehiculoId?.toLowerCase() ? null : candidato
}
