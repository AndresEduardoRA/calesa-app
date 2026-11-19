// Los tipos de la cotización aprobada de un vehículo (B4): lo que devuelve aprobar y lo que se lee de `cotizaciones_aprobadas`. Sin I/O.

// Una cotización por su número y su versión: lo que «Deshacer» necesita para volver a aprobarla.
export type CotizacionAprobable = { id: string; numero: number; actualizadoEn: string }

// `anterior` sólo viaja si quien aprobó la ve, puede aprobarla y sigue activa: sin ella no hay «Deshacer».
export type ResultadoDeAprobar = {
  cotizacion: CotizacionAprobable
  anterior: CotizacionAprobable | null
}

// La aprobada de un vehículo con su primer resultado congelado. `monto` cruza como texto (`numeric`): nunca pasa por un número hasta `<Monto>`.
export type CotizacionAprobadaDelVehiculo = {
  vehiculoId: string
  cotizacionId: string
  monto: string | null
  moneda: string
  // El nombre del modo de tipo de cambio de la cotización, ya resuelto por la base; nulo = sin modo, uno que la versión no tiene o sin permiso en su origen.
  modo: string | null
}

// Lo que la guardada necesita saber de su cotización: si es la aprobada y en qué estado está.
export type MarcaDeLaGuardada = { aprobada: boolean; estado: 'activa' | 'reportada' | 'invalida' }

// Lo que «Comparar cotizaciones» lee de cada cotización comparada además de su hoja: de qué vehículo es, su estado, quién la creó y si es la aprobada. El autor ya es el texto
// que se muestra (`autorVisible`).
export type MarcaParaComparar = {
  id: string
  numero: number
  vehiculoId: string | null
  origenId: string
  estado: MarcaDeLaGuardada['estado']
  autor: string
  aprobada: boolean
}
