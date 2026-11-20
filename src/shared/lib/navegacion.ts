import type { Route } from 'next'
import { permanentRedirect, redirect } from 'next/navigation'

// `redirect()` con un destino calculado. Con `typedRoutes`, Next sólo acepta rutas que conoce al
// compilar; un `returnTo`, una ruta con `?aviso=` o la URL de Google no lo son. Quien arma el
// destino es responsable de que sea seguro (`returnToSeguro`, `destinoTrasIngresar`).
// Como `redirect()`, corta la ejecución: nunca dentro de un `try`.
export function redirigir(destino: string): never {
  redirect(destino as Route)
}

// Lo mismo con 308 (`permanentRedirect()`): un enlace viejo que cambió de forma para siempre (el `?situacion=` del inventario). Fuera de todo `try`.
export function redirigirPermanente(destino: string): never {
  permanentRedirect(destino as Route)
}
