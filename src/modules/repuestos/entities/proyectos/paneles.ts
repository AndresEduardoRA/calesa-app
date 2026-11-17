// Los paneles de `/repuestos` (8.09-1): `?panel=nuevo-proyecto`, con `?vehiculo=<id>` para abrirlo ya vinculado (lo usa `<ResumenRepuestos>` en 8.09-4) y `?lead=<id>` con
// el cliente ya elegido. «Nuevo lead» del formulario ocupa `?panel=`: antes de abrirlo, el formulario deja su clave propia (`?nuevo=proyecto`), así sigue en la URL debajo
// del alta y vuelve a la vista al cerrarla (`docs/LECCIONES.md` › «Interfaz»: clave propia para lo que convive). El alta deja al lead creado en `?lead=`.
export const PANEL_NUEVO_PROYECTO = 'nuevo-proyecto'
export const CLAVE_DE_VEHICULO = 'vehiculo'
export const CLAVE_DEL_PROYECTO_NUEVO = 'nuevo'
export const PROYECTO_NUEVO = 'proyecto'
export const CLAVE_DE_LEAD_DEL_PROYECTO = 'lead'
export const MENSAJE_VEHICULO_QUE_NO_SE_VE = 'No encontramos ese vehículo o no tienes acceso.'
export const MENSAJE_LEAD_QUE_NO_SE_VE = 'No encontramos ese lead o no tienes acceso.'

// Los parámetros de la URL, como los lee el servidor (`searchParams`) o los da `nuqs`.
type Parametros = Readonly<Record<string, string | readonly string[] | null | undefined>>

function uno(valor: string | readonly string[] | null | undefined): string | null {
  return (typeof valor === 'string' ? valor : valor?.[0]) ?? null
}

/** El formulario está en la URL: abierto (`?panel=nuevo-proyecto`) o debajo de otro panel (`?nuevo=proyecto`). */
export function nuevoProyectoEnLaUrl(parametros: Parametros): boolean {
  return (
    uno(parametros['panel']) === PANEL_NUEVO_PROYECTO ||
    uno(parametros[CLAVE_DEL_PROYECTO_NUEVO]) === PROYECTO_NUEVO
  )
}

/** El formulario está a la vista: abierto, o debajo de otro panel que ya se cerró (`?nuevo=proyecto` sin ningún `?panel=`). */
export function nuevoProyectoALaVista(parametros: Parametros): boolean {
  const panel = uno(parametros['panel'])
  return (
    panel === PANEL_NUEVO_PROYECTO ||
    (panel === null && uno(parametros[CLAVE_DEL_PROYECTO_NUEVO]) === PROYECTO_NUEVO)
  )
}
