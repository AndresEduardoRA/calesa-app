// Lo que dibuja «elegir un lead de mi cartera» (el segundo paso de «Nuevo» en la barra superior). Puro: el hook guarda estos valores y el componente los pinta.
import type { FilaDeLead } from './resultados'

export type EstadoDeElegirLead =
  // Texto bajo el mínimo: nada que pedir, sólo la pista.
  | { tipo: 'reposo' }
  // Un teléfono no se busca (es un oráculo de lo que la cartera ajena tiene cargado): no se pide nada.
  | { tipo: 'telefono' }
  // Hay un texto que alcanza y corre la espera de la escritura.
  | { tipo: 'esperando' }
  | { tipo: 'buscando' }
  // `filas` vacío = «Sin resultados»; `hayMas`: hay otros que no se muestran.
  | { tipo: 'listo'; filas: FilaDeLead[]; hayMas: boolean }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_conexion'; mensaje: string }

// El nombre que se ve de un lead: sin nombre, el número, y sin nada, «Sin nombre».
export function etiquetaDeLead(fila: Pick<FilaDeLead, 'nombre' | 'numero_visible'>): string {
  const nombre = fila.nombre?.trim()
  if (nombre) {
    return nombre
  }
  return fila.numero_visible === null ? 'Sin nombre' : `Lead #${String(fila.numero_visible)}`
}
