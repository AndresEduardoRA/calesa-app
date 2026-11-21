import { expect, test, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'

const CLAVE = 'una-clave-de-prueba-9'
let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-rol-vista-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Vista' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// «Rol a la vista» al desplazar: en escritorio la fila con los nombres de los roles se queda pegada arriba mientras se desplazan los
// permisos; en el celular, la barra con el rol elegido queda bajo la barra superior y el título del módulo se pega justo debajo.
test('«Rol a la vista»: al desplazar los permisos, el rol y el módulo siguen a la vista', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  const alto = page.viewportSize()!.height
  if (esMovil(page)) {
    const barra = page.getByLabel('Rol a la vista')
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    const caja = (await barra.boundingBox())!
    expect(caja.y).toBeGreaterThanOrEqual(0)
    expect(caja.y + caja.height).toBeLessThanOrEqual(alto)
    // Algún título de módulo está pegado justo bajo la barra: el módulo que se está viendo.
    const pegado = await page.locator('section[aria-label] > h2').evaluateAll((titulos, borde) => {
      return titulos.some((t) => Math.abs(t.getBoundingClientRect().top - borde) <= 12)
    }, caja.y + caja.height)
    expect(pegado).toBe(true)
    return
  }
  const contenedor = page.locator('[data-slot="table-container"]')
  await contenedor.evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2
  })
  const arriba = (await contenedor.boundingBox())!.y
  const cabecera = page.locator('thead th').nth(1)
  const caja = (await cabecera.boundingBox())!
  expect(Math.abs(caja.y - arriba)).toBeLessThanOrEqual(2)
  await expect(cabecera).toBeInViewport()
  const pegado = await page.locator('th[scope="colgroup"]').evaluateAll((titulos, borde) => {
    return titulos.some((t) => Math.abs(t.getBoundingClientRect().top - borde) <= 4)
  }, caja.y + caja.height)
  expect(pegado).toBe(true)
})
