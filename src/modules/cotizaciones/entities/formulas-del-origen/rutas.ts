// Los nombres que la pestaña «Fórmulas» escribe en la URL: los paneles (`?panel=`, con `usePanelPorUrl()`) y sus claves. Las rutas, en `@/shared/lib/rutas`
// (`rutaDeLasFormulas()`, `rutaDeLaFormula()`).

export const PANEL_NUEVA_FORMULA = 'nueva-formula'
export const PANEL_RENOMBRAR_FORMULA = 'renombrar-formula'
export const PANEL_ACTIVAR_FORMULA = 'activar-formula'
export const PANEL_ARCHIVAR_FORMULA = 'archivar-formula'
export const PANEL_ELIMINAR_FORMULA = 'eliminar-formula'

// La fórmula que nombra un panel (`&formula=<id>`).
export const CLAVE_DE_LA_FORMULA = 'formula'
// La fórmula de la que se copia (`?panel=nueva-formula&copia=<id>`).
export const CLAVE_DE_LA_COPIA = 'copia'
