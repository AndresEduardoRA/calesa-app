// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el selector y el buscador del celular se miran en el recorrido de la IA
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'

// El inicio de Configuración vive en `/configuracion/inicio`: `/configuracion` redirige (308, con su consulta), el menú de Configuración está a la
// vista, el buscador filtra por nombre y por palabra clave, y las tarjetas van en mampostería, sin huecos ni solapes.

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-inicio-config-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Ines Inicio' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })
const buscador = (page: Page) => page.getByRole('searchbox', { name: 'Buscar en Configuración' })
const resultados = (page: Page) => page.getByRole('list', { name: 'Resultados de la búsqueda' })

test('E2E /configuracion redirige en el servidor con 308 y su consulta', async ({ request }) => {
  for (const consulta of ['', '?seccion=cotizacion', '?a=1&b=dos']) {
    const respuesta = await request.get(`/configuracion${consulta}`, { maxRedirects: 0 })
    expect(respuesta.status(), consulta).toBe(308)
    expect(respuesta.headers()['location'], consulta).toMatch(
      new RegExp(`/configuracion/inicio${consulta.replace('?', '\\?')}$`),
    )
  }
})

test('E2E el inicio lleva el menú, el buscador y las tarjetas, sin la vuelta', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion?x=1')
  await expect(page).toHaveURL(/\/configuracion\/inicio\?x=1$/)
  await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible()
  await expect(menu(page)).toBeVisible()
  // Un solo buscador: el de la página (el del menú sólo va dentro de una sección).
  await expect(buscador(page)).toHaveCount(1)
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Configuración', exact: true }),
  ).toHaveCount(0)
  // El grupo es un rótulo, no un enlace; la sección, un enlace con su nombre.
  await expect(menu(page).getByRole('link', { name: 'Empresa y equipo' })).toHaveCount(0)
  await expect(menu(page).getByText('Empresa y equipo', { exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Empresa', exact: true })).toBeVisible()
  // Nada está abierto: ninguna sub-sección a la vista.
  await expect(menu(page).getByRole('link', { name: 'Datos de la empresa' })).toBeHidden()
})

test('E2E el buscador encuentra por nombre y por palabra clave, y Enter abre el primero', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  // La tecla «/» enfoca el buscador.
  await page.getByRole('heading', { name: 'Configuración', level: 1 }).click()
  await page.keyboard.press('/')
  await expect(buscador(page)).toBeFocused()

  // Por palabra clave: «logo» no está en ningún título.
  await buscador(page).fill('logo')
  await expect(resultados(page).getByRole('link').first()).toHaveText(
    'Empresa › Datos de la empresa',
  )
  // Mientras se busca, las tarjetas no se ven.
  await expect(page.getByRole('region', { name: 'Ventas' })).toBeHidden()

  // Por nombre, sin acentos.
  await buscador(page).fill('origenes')
  await expect(resultados(page).getByRole('link').first()).toHaveText('Orígenes')

  // Por palabra clave de una tarjeta: lleva a la sección que la contiene.
  await buscador(page).fill('whatsapp')
  await expect(resultados(page).getByRole('link', { name: 'Leads', exact: true })).toBeVisible()

  // Enter abre el primero.
  await buscador(page).fill('logo')
  await expect(resultados(page).getByRole('link').first()).toBeVisible()
  await buscador(page).press('Enter')
  await expect(page).toHaveURL(/\/configuracion\/empresa$/)
  await expect(page.getByRole('heading', { name: 'Datos de la empresa', level: 1 })).toBeVisible()
})

test('E2E sin resultados: «Nada coincide con «x».» y «Limpiar» devuelve las tarjetas', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  await buscador(page).fill('zzqx')
  await expect(page.getByText('Nada coincide con «zzqx».')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(buscador(page)).toHaveValue('')
  await expect(buscador(page)).toBeFocused()
  await expect(page.getByRole('region', { name: 'Ventas' })).toBeVisible()
})

test('E2E dentro de una sección el buscador va arriba del menú y sólo la sección abierta despliega sus sub-secciones', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/leads/campos')
  // El del menú; el del celular (arriba de la página) se esconde donde el menú se ve.
  await expect(buscador(page)).toHaveCount(1)
  await expect(menu(page)).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Campos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(menu(page).getByRole('link', { name: 'Datos de la empresa' })).toBeHidden()

  // Buscar desde el menú cambia de sección y la búsqueda se vacía al llegar.
  await buscador(page).fill('equipo')
  await resultados(page).getByRole('link', { name: 'Equipo', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/equipo$/)
  await expect(buscador(page)).toHaveValue('')
  await expect(menu(page)).toBeVisible()
})

test('E2E las tarjetas del inicio van en mampostería: sin solapes ni huecos de más', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const tarjetas = page.getByRole('main').getByRole('region')
  await expect(tarjetas.first()).toBeVisible()
  const cajas = await tarjetas.evaluateAll((nodos) =>
    nodos.map((nodo) => {
      const { x, y, width, height } = nodo.getBoundingClientRect()
      return { x, y, width, height }
    }),
  )
  expect(cajas.length).toBeGreaterThanOrEqual(3)
  for (const [i, a] of cajas.entries()) {
    for (const b of cajas.slice(i + 1)) {
      const seCruzan =
        a.x < b.x + b.width - 1 &&
        b.x < a.x + a.width - 1 &&
        a.y < b.y + b.height - 1 &&
        b.y < a.y + a.height - 1
      expect(seCruzan, `la tarjeta ${String(i)} no se cruza con otra`).toBe(false)
    }
  }
  // Dos columnas, y en cada una una tarjeta empieza 16 px debajo de la anterior (el hueco de la rejilla), no más.
  const columnas = new Set(cajas.map((caja) => Math.round(caja.x)))
  expect(columnas.size).toBe(2)
  for (const x of columnas) {
    const deLaColumna = cajas.filter((caja) => Math.round(caja.x) === x).sort((a, b) => a.y - b.y)
    for (const [i, caja] of deLaColumna.slice(1).entries()) {
      const anterior = deLaColumna[i]
      expect(caja.y - ((anterior?.y ?? 0) + (anterior?.height ?? 0))).toBeLessThanOrEqual(17)
    }
  }
})
