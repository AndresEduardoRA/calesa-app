// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { literal, sql } from './soporte/sql'

// Configuración › Cotización por origen (`docs/UX.md` › «Cotización (config)»): el inicio con una tarjeta por origen y «General», las cuatro
// pestañas de un origen con los chips de origen, General con sus tres partes, los enlaces de antes y quién ve qué.
test.describe.configure({ mode: 'serial' })

const BASE = '/configuracion/cotizacion'

let proyecto = ''
let conFormula = { id: '', nombre: '' }
let sinFormula = { id: '', nombre: '' }
let inactivo = { id: '', nombre: '' }
let duena = ''
let configuradora = ''
let lectora = ''

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-por-origen-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Olga Origen' })
  conFormula = await crearOrigenDeCotizar(proyecto, 'porconf', true)
  sinFormula = await crearOrigenDeCotizar(proyecto, 'porsinf', false)
  inactivo = await crearOrigenDeCotizar(proyecto, 'porinac', false)
  sql(`update public.origenes set activo = false where id = ${literal(inactivo.id)}::uuid`)
  configuradora = correoDePrueba(`configura-por-origen-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cora Configura',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}PorOrigen ${proyecto}`, clave: `e2e_por_origen_${proyecto}` },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: sinFormula.id }],
  })
  lectora = correoDePrueba(`lectora-por-origen-${proyecto}`)
  await crearPersona({ email: lectora, contrasena: CONTRASENA, nombre: 'Lía Lee', invitada: true })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}LeeRoles ${proyecto}`, clave: `e2e_lee_roles_${proyecto}` },
    permisos: ['equipo.roles.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const tarjetaDe = (page: Page, nombre: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: nombre, exact: true }) })

const chips = (page: Page) => page.getByRole('navigation', { name: 'Origen' })

async function enLaPestana(page: Page, ruta: RegExp, titulo: string, frase: string) {
  await expect(page).toHaveURL(ruta)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(page.getByRole('main').getByText(frase, { exact: true })).toBeVisible()
}

test('E2E escritorio · el inicio muestra cada origen con lo publicado y «General»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(BASE)
  await expect(page.getByRole('heading', { name: 'Cotización', level: 1 })).toBeVisible()
  const conF = tarjetaDe(page, conFormula.nombre)
  await expect(conF).toContainText(/v\d+ publicada · Sin tarjeta/)
  await expect(conF.getByRole('link', { name: 'Falta publicar la tarjeta' })).toHaveAttribute(
    'href',
    `${BASE}/${conFormula.id}/tarjeta`,
  )
  const sinF = tarjetaDe(page, sinFormula.nombre)
  await expect(sinF).toContainText('Sin fórmula publicada · Sin tarjeta')
  await expect(sinF.getByRole('link', { name: 'Falta publicar la fórmula' })).toHaveAttribute(
    'href',
    `${BASE}/${sinFormula.id}/formula`,
  )
  const inac = tarjetaDe(page, inactivo.nombre)
  await expect(inac).toContainText('Inactivo')
  await expect(inac.getByRole('link', { name: /^Falta publicar/ })).toHaveCount(0)
  const general = page.getByRole('main').getByRole('list', { name: 'Partes generales' })
  await expect(general.getByRole('link')).toHaveText([/^Colores/, /^Niveles/, /^Vigencia/])
})

test('E2E escritorio · un origen en sus cuatro pestañas; los chips cambian de origen y conservan la pestaña', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto(BASE)
  await page.getByRole('link', { name: conFormula.nombre, exact: true }).click()
  const id = conFormula.id
  await enLaPestana(page, new RegExp(`${BASE}/${id}/formula$`), 'Fórmula', 'Qué se calcula.')
  // «‹ Cotización» vuelve al inicio (el otro enlace con ese nombre es el del menú de Configuración).
  await expect(
    page.locator(`main a[href="${BASE}"]:not(nav a)`, { hasText: 'Cotización' }),
  ).toBeVisible()
  await expect(chips(page).getByRole('link', { name: conFormula.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(chips(page).getByRole('link', { name: inactivo.nombre })).toContainText('(inactivo)')
  await page.getByRole('tab', { name: 'Hoja' }).click()
  await enLaPestana(
    page,
    new RegExp(`${BASE}/${id}/hoja$`),
    'Hoja',
    'Cómo se ve y se llena la cotización.',
  )
  await page.getByRole('tab', { name: 'Tarjeta' }).click()
  await enLaPestana(
    page,
    new RegExp(`${BASE}/${id}/tarjeta$`),
    'Tarjeta',
    'La imagen que recibe el cliente.',
  )
  await page.getByRole('tab', { name: 'Tablas' }).click()
  await enLaPestana(
    page,
    new RegExp(`${BASE}/${id}/tablas$`),
    'Tablas',
    'Valores de referencia: depreciación, transporte…',
  )
  await chips(page).getByRole('link', { name: sinFormula.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`${BASE}/${sinFormula.id}/tablas$`))
  await expect(page.getByRole('tab', { name: 'Tablas' })).toHaveAttribute('aria-selected', 'true')
  await expect(chips(page).getByRole('link', { name: sinFormula.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('E2E escritorio · General › Colores, Niveles y Vigencia', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`${BASE}/general`)
  await enLaPestana(
    page,
    new RegExp(`${BASE}/general/colores$`),
    'Colores',
    'Los colores de la hoja y de la tarjeta, para toda la empresa.',
  )
  await expect(chips(page)).toHaveCount(0)
  await page.getByRole('tab', { name: 'Niveles' }).click()
  await enLaPestana(
    page,
    new RegExp(`${BASE}/general/niveles$`),
    'Niveles',
    'Quién ve y edita qué celdas.',
  )
  await page.getByRole('tab', { name: 'Vigencia' }).click()
  await enLaPestana(
    page,
    new RegExp(`${BASE}/general/vigencia$`),
    'Vigencia',
    'Cuántos días vale una cotización.',
  )
})

test('E2E escritorio · los enlaces de antes van a su sub-ruta, con el panel abierto', async ({
  page,
}) => {
  await entrar(page, duena)
  const casos: [string, RegExp][] = [
    [`seccion=formula&origen=${sinFormula.id}`, new RegExp(`${BASE}/${sinFormula.id}/formula$`)],
    [`seccion=diseno&origen=${sinFormula.id}`, new RegExp(`${BASE}/${sinFormula.id}/hoja$`)],
    [`seccion=tarjeta&origen=${sinFormula.id}`, new RegExp(`${BASE}/${sinFormula.id}/tarjeta$`)],
    [`seccion=tablas&origen=${sinFormula.id}`, new RegExp(`${BASE}/${sinFormula.id}/tablas$`)],
    ['seccion=tonos', new RegExp(`${BASE}/general/colores$`)],
    ['seccion=niveles', new RegExp(`${BASE}/general/niveles$`)],
    ['seccion=ajustes', new RegExp(`${BASE}/general/vigencia$`)],
  ]
  for (const [consulta, destino] of casos) {
    await page.goto(`${BASE}?${consulta}`)
    await expect(page, consulta).toHaveURL(destino)
  }
  await page.goto(`${BASE}?seccion=formula&origen=${conFormula.id}&panel=editar-formula`)
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/${conFormula.id}/formula\\?panel=editar-formula$`),
  )
  await expect(page.getByRole('list', { name: 'Filas de la fórmula' })).toBeVisible()
})

test('E2E escritorio · quien configura un origen va al suyo desde uno ajeno, y Niveles va apagada', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`${BASE}/${conFormula.id}/hoja`)
  await expect(page).toHaveURL(new RegExp(`${BASE}/${sinFormula.id}/hoja$`))
  await expect(chips(page).getByRole('link')).toHaveCount(1)
  await page.goto(`${BASE}/no-es-un-origen/tablas`)
  await expect(page).toHaveURL(new RegExp(`${BASE}/${sinFormula.id}/tablas$`))
  await page.goto(`${BASE}/general/niveles`)
  await expect(page).toHaveURL(new RegExp(`${BASE}/${sinFormula.id}/formula$`))
  await page.goto(`${BASE}/general/colores`)
  await expect(page.getByRole('tab', { name: 'Niveles' })).toBeDisabled()
  await expect(page.getByText('Te falta el permiso «Ver roles».').first()).toBeVisible()
})

test('E2E escritorio · quien sólo ve los roles ve sólo «General › Niveles»', async ({ page }) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(BASE)
  await expect(page.getByText('No configuras ningún origen.')).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('list', { name: 'Partes generales' }).getByRole('link'),
  ).toHaveText([/^Niveles/])
  await expect(page.getByText('Por origen', { exact: true })).toHaveCount(0)
  await page.goto(`${BASE}/${conFormula.id}/formula`)
  await expect(page).toHaveURL(new RegExp(`${BASE}/general/niveles$`))
  await expect(page.getByRole('heading', { name: 'Niveles', level: 1 })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
})
