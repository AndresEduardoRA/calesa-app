// Aprobar una privada en la URL (`?panel=aprobar-privada&para=<id>&desde=<pantalla>`): la pregunta que dice que deja de ser privada. `desde` nombra quién la abrió (dos
// pueden estar montadas a la vez: el listado y «De este vehículo» dentro de su resumen) y sólo esa la dibuja. Nada de React: lo usan `features/aprobada/` con
// `usePanelPorUrl()`.
export const PANEL_APROBAR_PRIVADA = 'aprobar-privada'
export const CLAVE_DE_DESDE = 'desde'
export type DesdeDondeSeAprueba = 'fila' | 'guardada' | 'vehiculo' | 'comparar'
