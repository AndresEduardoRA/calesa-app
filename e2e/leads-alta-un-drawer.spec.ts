import {
  abrirNuevoLeadDeLaBarra,
  botonNuevoDeLaBarra,
  dialogo,
  entrar,
  limpiarAlta,
  modalDeNuevo,
  prepararAlta,
  type PersonasDelAlta,
} from './soporte/alta'
import { contarElDrawer, leerCuenta, type Cuenta } from './soporte/contar-drawer'
import { esMovil } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { expect, test, type Locator, type Page, type Route, type TestInfo } from './soporte/prueba'

// 5b-6: «Nuevo lead» es UN solo drawer, aunque lo que lee tarde. Se abre al instante con su esqueleto y, cuando llega el formulario (o el error),
// cambia de cuerpo: no se vuelve a montar ni a deslizar. Se cuenta, no se mira el DOM final: cada vez que entra al documento una hoja del
// drawer «Nuevo lead» (montajes) y cada vez que una hoja distinta se anima al entrar (`transitionrun` de su desplazamiento o su opacidad;
// el muestreo cuadro a cuadro de su caja queda como dato, no se aserta: en el celular se le escapa alguna).
// Con el celular (un toque, sin hover) y con el escritorio (un clic sin hover previo), con la lectura de lo que necesita retrasada.
const CONTEXTO = '**/rest/v1/rpc/lead_alta_contexto'
const CAMPOS = '**/rest/v1/leads_campos*'

let personas: PersonasDelAlta
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-un-drawer`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

const telefono = (page: Page) => dialogo(page).getByLabel('Teléfono principal')

// Cada pedido a la base del alta tarda `ms` más en salir.
async function demorar(page: Page, ms: number) {
  const con = async (ruta: Route) => {
    await new Promise((listo) => setTimeout(listo, ms))
    await ruta.continue().catch(() => undefined)
  }
  await page.route(CONTEXTO, con)
  await page.route(CAMPOS, con)
}

function contarPedidos(page: Page) {
  const pedidos = { contexto: 0, campos: 0 }
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/rpc/lead_alta_contexto')) pedidos.contexto += 1
    if (pedido.url().includes('/rest/v1/leads_campos')) pedidos.campos += 1
  })
  return pedidos
}

async function aLeads(page: Page) {
  await entrar(page, personas.duena)
  await contarElDrawer(page)
  await page.goto('/leads')
  await expect(botonNuevoDeLaBarra(page)).toBeVisible()
}

// «Nuevo» › «Lead»: el modal de la barra y su primera opción.
const abrir = (page: Page) => abrirNuevoLeadDeLaBarra(page)

// Deja la cuenta a la vista aunque la prueba falle (la medición contra el código de antes).
async function anotar(page: Page, info: TestInfo, caso: string): Promise<Cuenta> {
  await page.waitForTimeout(600)
  const cuenta = await leerCuenta(page)
  const linea = `${caso}: ${String(cuenta.montajes)} montajes, ${String(cuenta.animados)} transiciones de entrada, ${String(cuenta.movidos)} vistas moverse por muestreo (${String(cuenta.conEstadoInicial)} con estado inicial)`
  console.warn(`[un drawer] ${info.project.name} ${linea}`)
  info.annotations.push({ type: 'drawer del alta', description: linea })
  return cuenta
}

for (const ms of [150, 400, 1500]) {
  test(`con la lectura en ${String(ms)} ms el drawer se monta y se anima una sola vez`, async ({
    page,
  }, info) => {
    await aLeads(page)
    await demorar(page, ms)
    const pedidos = contarPedidos(page)
    await abrir(page)
    await expect(dialogo(page)).toBeVisible()
    await expect(telefono(page)).toBeFocused({ timeout: 10_000 })
    const cuenta = await anotar(page, info, `lectura ${String(ms)} ms`)
    if (ms >= 400) expect(cuenta.vioEsqueleto, 'pasó por el esqueleto').toBe(true)
    expect(cuenta.montajes, 'montajes del drawer').toBe(1)
    expect(cuenta.animados, 'animaciones de entrada').toBe(1)
    expect(pedidos).toEqual({ contexto: 1, campos: 1 })
    if (ms === 1500) await capturar(page, info, 'alta-formulario')
  })
}

test('con un 500 el error llega al mismo drawer y reintentar lo deja con el formulario, sin otro montaje', async ({
  page,
}, info) => {
  await aLeads(page)
  await demorar(page, 400)
  await page.route(CONTEXTO, async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 400))
    await ruta.fulfill({ status: 500, body: '{"message":"x"}' })
  })
  await abrir(page)
  const panel = dialogo(page)
  await expect(panel.getByText('No se pudo cargar el formulario.')).toBeVisible()
  await capturar(page, info, 'alta-error-500')
  await page.unroute(CONTEXTO)
  await panel.getByRole('button', { name: 'Reintentar' }).click()
  await expect(telefono(page)).toBeVisible()
  const cuenta = await anotar(page, info, 'error 500 y reintento')
  expect(cuenta.vioError).toBe(true)
  expect(cuenta.montajes, 'montajes del drawer').toBe(1)
  expect(cuenta.animados, 'animaciones de entrada').toBe(1)
})

test('con la red caída el error llega al mismo drawer, sin otro montaje', async ({
  page,
}, info) => {
  await aLeads(page)
  await page.route(CONTEXTO, (ruta) => ruta.abort('failed'))
  await page.route(CAMPOS, (ruta) => ruta.abort('failed'))
  await abrir(page)
  await expect(dialogo(page).getByText('No se pudo cargar el formulario.')).toBeVisible()
  await capturar(page, info, 'alta-error-sin-red')
  const cuenta = await anotar(page, info, 'red caída')
  expect(cuenta.montajes, 'montajes del drawer').toBe(1)
  expect(cuenta.animados, 'animaciones de entrada').toBe(1)
})

test('cerrar y reabrir mientras lee: una hoja por apertura, y una sola lectura', async ({
  page,
}, info) => {
  await aLeads(page)
  await demorar(page, 1500)
  const pedidos = contarPedidos(page)
  await abrir(page)
  await expect(dialogo(page).getByLabel('Cargando el formulario')).toBeVisible()
  // Cerrar con la entrada ya en marcha: la primera hoja se vio animarse antes de irse.
  await expect.poll(async () => (await leerCuenta(page)).animados).toBe(1)
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await abrir(page)
  await expect(telefono(page)).toBeFocused({ timeout: 10_000 })
  const cuenta = await anotar(page, info, 'cerrar y reabrir mientras lee')
  expect(cuenta.montajes, 'una hoja por apertura (2 aperturas)').toBe(2)
  expect(cuenta.animados, 'una animación de entrada por apertura').toBe(2)
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})

// Dos toques seguidos en el centro del botón.
async function doblarToque(page: Page, boton: Locator) {
  const caja = await boton.boundingBox()
  if (!caja) throw new Error('El botón no tiene caja.')
  const x = caja.x + caja.width / 2
  const y = caja.y + caja.height / 2
  await page.touchscreen.tap(x, y)
  await page.touchscreen.tap(x, y)
}

test('un doble toque o un doble clic abre un solo drawer, lo anima una vez y lee una vez', async ({
  page,
}, info) => {
  await aLeads(page)
  await demorar(page, 1000)
  const pedidos = contarPedidos(page)
  // Un doble toque o clic en «Nuevo» deja el modal abierto (el segundo no lo cierra) y otro en «Lead» abre un solo drawer.
  if (esMovil(page)) {
    await doblarToque(page, botonNuevoDeLaBarra(page))
    await expect(modalDeNuevo(page)).toBeVisible()
    await doblarToque(page, modalDeNuevo(page).getByRole('button', { name: /^Lead/ }))
  } else {
    await botonNuevoDeLaBarra(page).dblclick()
    await expect(modalDeNuevo(page)).toBeVisible()
    await modalDeNuevo(page).getByRole('button', { name: /^Lead/ }).dblclick()
  }
  await expect(dialogo(page)).toHaveCount(1)
  await expect(telefono(page)).toBeVisible({ timeout: 10_000 })
  const cuenta = await anotar(page, info, 'doble toque')
  expect(cuenta.montajes, 'montajes del drawer').toBe(1)
  expect(cuenta.animados, 'animaciones de entrada').toBe(1)
  expect(pedidos).toEqual({ contexto: 1, campos: 1 })
})
