// Los paneles que abre el «⋯» del vehículo, en la URL: `?panel=imagenes` y `?panel=actualizar-datos` (en el inventario, con `&para=<id>`). Fuera de los
// hooks porque el servidor también los lee (`src/app/(app)/vehiculos/paneles.ts`).
export const PANEL_DE_IMAGENES = 'imagenes'
export const PANEL_ACTUALIZAR_LOS_DATOS = 'actualizar-datos'
// Qué vehículo nombra un panel del inventario.
export const CLAVE_DEL_VEHICULO_DEL_PANEL = 'para'
