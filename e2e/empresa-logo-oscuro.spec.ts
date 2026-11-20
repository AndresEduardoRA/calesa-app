// @sin-celular-archivo: el formulario de la empresa y la marca del marco son los mismos en celular; la marca del marco en celular la recorre el primer caso de empresa.spec.ts, que corre en los dos anchos
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  ajustesGuardados,
  editarTarjeta,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// El logo para el tema oscuro (9.10-2) contra la app compilada y el Supabase local. La empresa es
// una fila única: se guarda cómo estaba y al terminar se deja exactamente así.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const LOGO_CLARO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#0b7285"/></svg>'
const LOGO_OSCURO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#e6f4f6"/></svg>'
const RUTA_DE_LOGO = /^logos\/[0-9a-f]{64}\.svg$/

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-logo-oscuro-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Olga Oscura' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

function elegir(dialogo: Locator, etiqueta: string, nombre: string, svg: string) {
  return dialogo.getByLabel(etiqueta, { exact: true }).setInputFiles({
    name: nombre,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  })
}

async function guardar(page: Page, dialogo: Locator) {
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(dialogo).toBeHidden()
}

test('la dueña carga el logo para el tema oscuro y cada tema dibuja el suyo', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/empresa')

  // Los dos logos se eligen y viajan en un solo guardado.
  const identidad = await editarTarjeta(page, 'Identidad')
  await elegir(identidad, 'Elegir el logo de la empresa', 'claro.svg', LOGO_CLARO)
  await elegir(identidad, 'Elegir el logo para el tema oscuro', 'oscuro.svg', LOGO_OSCURO)
  await expect(
    identidad.getByRole('button', { name: 'Cambiar logo oscuro', exact: true }),
  ).toBeVisible()
  await guardar(page, identidad)
  const guardados = await ajustesGuardados()
  expect(guardados.logo_ruta).toMatch(RUTA_DE_LOGO)
  expect(guardados.logo_oscuro_ruta).toMatch(RUTA_DE_LOGO)
  expect(guardados.logo_oscuro_ruta).not.toBe(guardados.logo_ruta)

  // Con el tema claro se ve el normal; con el oscuro, el oscuro.
  const claro = page.locator('[data-logo="claro"]')
  const oscuro = page.locator('[data-logo="oscuro"]')
  await expect(claro).toBeVisible()
  await expect(claro).toHaveAttribute('src', new RegExp(guardados.logo_ruta ?? '-'))
  await expect(oscuro).toBeHidden()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(oscuro).toBeVisible()
  await expect(oscuro).toHaveAttribute('src', new RegExp(guardados.logo_oscuro_ruta ?? '-'))
  await expect(claro).toBeHidden()

  // Quitar el oscuro lo deja en null, sin tocar el normal, y el marco vuelve a un solo logo. Cada apertura del modal parte de lo
  // guardado: la vista previa ya es la de Storage, no la del archivo elegido.
  const otra = await editarTarjeta(page, 'Identidad')
  await expect(
    otra.getByRole('img', { name: 'Logo de la empresa para el tema oscuro', exact: true }),
  ).toHaveAttribute('src', new RegExp(guardados.logo_oscuro_ruta ?? '-'))
  await otra.getByRole('button', { name: 'Quitar el logo oscuro', exact: true }).click()
  await otra.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect.poll(async () => (await ajustesGuardados()).logo_oscuro_ruta).toBeNull()
  expect((await ajustesGuardados()).logo_ruta).toBe(guardados.logo_ruta)
  await expect(oscuro).toHaveCount(0)
  await expect(claro).toBeVisible()
})
