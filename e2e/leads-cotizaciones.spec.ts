import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { capturar } from './soporte/recorrido'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// El bloque «Cotizaciones» de la ficha del lead (`docs/UX.md` › «Lead»): lo ve quien tiene `cotizaciones.ver` en algún origen (sin mirar la cartera). El título con
// «Cotizar» lo dibuja el servidor; las cotizaciones se leen desde el navegador al acercarse y son tarjetas en una fila que se desliza: las últimas 10 y, si hay más, «Ver más»
// (`/cotizaciones?lead=`). Un clic abre el resumen sobre la ficha. Con la RLS de quien mira.

// La primera (y única) respuesta con 11 filas en la base (10 y una de más para saber si hay otra), con los nombres aparte.
const TOPE_DE_BYTES = 6_500

let origen = { id: '', nombre: '' }
let duena = ''
let sinClave = ''
let ana = ''
const leads: Record<'once' | 'cinco' | 'ninguna' | 'compartido', string> = {
  once: '',
  cinco: '',
  ninguna: '',
  compartido: '',
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'leadcotiz'))
  const nuevo = (nombre: string) =>
    crearLead({ nombre: `${nombre} ${proyecto}`, telefono: telefonoAlAzar(), deQuien: duena })
  leads.once = await nuevo('cotiz once')
  leads.cinco = await nuevo('cotiz cinco')
  leads.ninguna = await nuevo('cotiz ninguna')
  leads.compartido = await nuevo('cotiz compartido')
  sinClave = correoDePrueba(`sinclave-leadcotiz-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sin Clave',
    invitada: true,
  })
  // Ve todos los leads y no tiene cotizaciones.ver.
  await darRolDePrueba({
    email: sinClave,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lead sin cotizaciones`, clave: 'e2e_lead_sin_cotizaciones' },
    permisos: ['leads.ver'],
  })
  ana = correoDePrueba(`ana-leadcotiz-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Propios', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lead propios`, clave: 'e2e_lead_propios' },
    permisos: ['leads.ver', { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' }],
  })
  const deLaDuena = idDePersona(duena)
  const base = { origenId: origen.id, creadoPor: deLaDuena }
  sembrarCotizaciones({ ...base, leadId: leads.once, cuantas: 11 })
  sembrarCotizaciones({ ...base, leadId: leads.cinco, cuantas: 5 })
  // Del lead compartido: dos de la dueña y una de Ana (la más vieja); el lead no está en la cartera de Ana.
  sembrarCotizaciones({ ...base, leadId: leads.compartido, cuantas: 2 })
  sembrarCotizaciones({
    origenId: origen.id,
    leadId: leads.compartido,
    creadoPor: idDePersona(ana),
    cuantas: 1,
    desde: 2,
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const titulo = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Cotizaciones', exact: true, level: 2 })
const bloque = (page: Page): Locator => page.locator('#cotizaciones')
const lista = (page: Page): Locator => page.getByRole('list', { name: 'Cotizaciones del lead' })
const tarjetas = (page: Page): Locator => lista(page).locator('article')
const verMas = (page: Page): Locator => bloque(page).getByRole('link', { name: 'Ver más' })
const esLectura = (url: string) => url.includes('/rpc/cotizaciones_listado')

// Los pedidos del navegador a `cotizaciones_listado` (el bloque lee desde el navegador; el servidor no lee cotizaciones para la ficha).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (esLectura(pedido.url()) && pedido.method() === 'POST') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E1 la dueña: el título llega con la ficha, no se lee hasta acercarse, y las tarjetas abren el resumen sobre la ficha sin perderla', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/leads/${leads.cinco}`)
  await expect(titulo(page)).toBeAttached()
  // Lejos de la vista no se lee (se pide a 200 px de entrar); si la ficha es corta y ya está cerca, se lee al llegar.
  const lejos = await bloque(page).evaluate(
    (b) => b.getBoundingClientRect().top > window.innerHeight + 200,
  )
  if (lejos) {
    expect(lecturas).toEqual([])
  }
  await indice(page).getByRole('link', { name: 'Cotizaciones' }).click()
  await expect(titulo(page)).toBeFocused()
  await expect(tarjetas(page)).toHaveCount(5)
  expect(lecturas).toHaveLength(1)
  const masNueva = sql(
    `select numero from public.cotizaciones where lead_id = ${literal(leads.cinco)}::uuid order by creado_en desc, id desc limit 1`,
  )
  const primera = tarjetas(page).first()
  await expect(primera).toContainText(`N.º ${masNueva}`)
  await expect(primera).toContainText('Gala Guarda')
  await expect(primera.getByRole('button', { name: 'Compartir' })).toBeVisible()
  // Sólo tarjetas: ningún enlace de fila de una lista de letras, y sin «Ver más» con 5.
  await expect(verMas(page)).toHaveCount(0)
  await capturar(page, info, 'lead-tarjetas')

  // El clic abre el resumen sobre la ficha, con la tarjeta abierta marcada; cerrarlo deja la ficha donde estaba.
  await primera.getByRole('button', { name: `Abrir N.º ${masNueva}` }).click()
  const drawer = page.getByRole('dialog', { name: `Cotización n.º ${masNueva}` })
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/\?cotizacion=[0-9a-f-]{36}/)
  // Con el resumen abierto la ficha queda detrás (inerte): la tarjeta se halla aunque no sea accesible.
  await expect(
    page
      .getByRole('list', { name: 'Cotizaciones del lead', includeHidden: true })
      .locator('article')
      .first(),
  ).toHaveAttribute('data-state', 'selected')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/leads/${leads.cinco}$`))
  await expect(titulo(page)).toBeVisible()
  await expect(tarjetas(page)).toHaveCount(5)
  expect(lecturas).toHaveLength(1)
})

test('E2 con 11: las últimas 10 se deslizan y la última tarjeta, «Ver más», lleva al listado del lead', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  const lecturas = vigilarLecturas(page)
  const respuesta = page.waitForResponse(
    (r) => esLectura(r.url()) && r.request().method() === 'POST',
  )
  await page.goto(`/leads/${leads.once}?seccion=cotizaciones`)
  await expect(tarjetas(page)).toHaveCount(10)
  const lectura = await respuesta
  const bytes = (await lectura.body()).length
  console.warn(
    `[cotizaciones del lead] ${test.info().project.name}: bytes con 11: ${String(bytes)}`,
  )
  test.info().annotations.push({ type: 'medido', description: `bytes con 11: ${String(bytes)}` })
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
  expect(lecturas).toHaveLength(1)
  expect(lectura.request().postData()).toContain(leads.once)
  await expect(verMas(page)).toHaveAttribute('href', `/cotizaciones?lead=${leads.once}`)

  // La fila se desliza: lo que queda a la derecha asoma con la pista y, en escritorio, la flecha lo trae.
  const fila = lista(page)
  const desborde = bloque(page).locator('[data-desborde="derecha"]')
  await expect(desborde).toHaveAttribute('data-visible', 'true')
  if (info.project.name.includes('escritorio')) {
    await bloque(page).getByRole('button', { name: 'Ver las cotizaciones siguientes' }).click()
    await expect.poll(() => fila.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0)
  }
  await fila.evaluate((e) => {
    e.scrollLeft = e.scrollWidth
  })
  await expect(verMas(page)).toBeInViewport()
  await expect(desborde).toHaveAttribute('data-visible', 'false')
  await capturar(page, info, 'lead-tarjetas-ver-mas')
  await verMas(page).click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones\\?lead=${leads.once}`))
})

test('E3 sin cotizaciones.ver no hay bloque ni entrada en el índice, y ?seccion=cotizaciones queda al principio', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/leads/${leads.compartido}?seccion=cotizaciones`)
  await expect(indice(page).getByRole('link', { name: 'Seguimiento' })).toBeVisible()
  await expect(indice(page).getByRole('link', { name: 'Cotizaciones' })).toHaveCount(0)
  await expect(bloque(page)).toHaveCount(0)
  expect(lecturas).toEqual([])
})

test('E3b con «propios» el bloque está aunque el lead no sea de su cartera, y la RLS deja sólo la suya', async ({
  page,
}) => {
  await entrar(page, ana, { fresco: true })
  await page.goto(`/leads/${leads.compartido}`)
  await indice(page).getByRole('link', { name: 'Cotizaciones' }).click()
  await expect(tarjetas(page)).toHaveCount(1)
  await expect(tarjetas(page).first()).toContainText('Ana Propios')
  await expect(lista(page)).not.toContainText('Gala Guarda')
  await expect(verMas(page)).toHaveCount(0)
})

test('E4 un lead sin cotizaciones: llegar con ?seccion=cotizaciones lleva al bloque y dice que no hay, también al recargar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/leads/${leads.ninguna}?seccion=cotizaciones`)
  await expect(titulo(page)).toBeFocused()
  await expect(indice(page).getByRole('link', { name: 'Cotizaciones' })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await expect(bloque(page).getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
  await page.reload()
  await expect(bloque(page).getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
})
