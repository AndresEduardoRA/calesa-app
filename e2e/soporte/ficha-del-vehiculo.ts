import { expect, type Locator } from '@playwright/test'
import { CONTRASENA } from './alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'

// Lo de `e2e/vehiculos-ficha-dos-columnas.spec.ts`.

// Una persona que ve los vehículos del origen y los leads, sin logística, cotizaciones ni repuestos. Devuelve su correo.
export async function personaSinLogistica(proyecto: string, origenId: string): Promise<string> {
  const correo = correoDePrueba(`sin-logistica-ficha-${proyecto}`)
  await crearPersona({
    email: correo,
    contrasena: CONTRASENA,
    nombre: 'Sin Logística',
    invitada: true,
  })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}sin logistica ficha ${proyecto}`,
      clave: `e2e_sin_logistica_ficha_${proyecto}`,
    },
    permisos: [{ clave: 'vehiculos.ver', origenId }, 'leads.ver'],
  })
  return correo
}

// La caja de un elemento (que tiene que estar dibujado).
export async function caja(
  elemento: Locator,
): Promise<{ x: number; y: number; derecha: number; abajo: number }> {
  const medida = await elemento.boundingBox()
  expect(medida).not.toBeNull()
  const { x, y, width, height } = medida ?? { x: 0, y: 0, width: 0, height: 0 }
  return { x, y, derecha: x + width, abajo: y + height }
}
