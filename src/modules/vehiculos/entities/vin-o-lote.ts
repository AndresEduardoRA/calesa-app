// Lo que identifica a un vehículo junto a su título donde no cabe su ficha (la cabecera de un proyecto de repuestos): el VIN, el lote o los dos. Puro.

const conValor = (texto: string | null): string | null => {
  const limpio = texto?.trim() ?? ''
  return limpio === '' ? null : limpio
}

/** «VIN X · Lote N» con los dos, «VIN X» o «Lote N» con uno, nulo sin ninguno (un texto en blanco cuenta como ausente). */
export function vinOLote(vehiculo: { vin: string | null; lote: string | null }): string | null {
  const vin = conValor(vehiculo.vin)
  const lote = conValor(vehiculo.lote)
  const textos: string[] = []
  if (vin !== null) textos.push(`VIN ${vin}`)
  if (lote !== null) textos.push(`Lote ${lote}`)
  return textos.length === 0 ? null : textos.join(' · ')
}
