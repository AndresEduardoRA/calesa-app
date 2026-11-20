// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
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

// La cotización de cada origen en su página y lo de toda la empresa en Catálogos (`docs/UX.md` › «La página del origen» y «Catálogos»): la pestaña
// Fórmula con sus sub-pestañas Fórmula · Hoja · Tarjeta y la pestaña Tablas, cada una su ruta; Colores, Niveles y Vigencia en Catálogos, por el
// menú; y quién abre qué. Las redirecciones de las rutas de antes, la tira «Para cotizar y mover» y las pestañas apagadas por permiso:
// `configuracion-origen-centro.spec.ts`.
test.describe.configure({ mode: 'serial' })

const ORIGENES = '/configuracion/origenes'
const CATALOGOS = '/configuracion/catalogos'

let proyecto = ''
let conFormula = { id: '', nombre: '' }
let sinFormula = { id: '', nombre: '' }
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

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })

async function enElCatalogo(page: Page, ruta: RegExp, titulo: string, frase: string) {
  await expect(page).toHaveURL(ruta)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(page.getByRole('main').getByText(frase, { exact: true })).toBeVisible()
}

test('E2E escritorio · la Fórmula de un origen en sus sub-pestañas, y su pestaña Tablas', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = conFormula.id
  await page.goto(`${ORIGENES}/${id}/datos`)
  await expect(page.getByRole('heading', { name: conFormula.nombre, level: 1 })).toBeVisible()
  await page.getByRole('tab', { name: 'Fórmula', exact: true }).first().click()
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${id}/formula$`))
  await enLaPestana(page, 'Fórmula')
  await page.getByRole('tab', { name: 'Hoja', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${id}/formula/hoja$`))
  await enLaPestana(page, 'Hoja')
  // Las pestañas del origen siguen marcando «Fórmula» bajo cada sub-pestaña.
  await expect(page.getByRole('tab', { name: 'Fórmula', exact: true }).first()).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Tarjeta', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${id}/formula/tarjeta$`))
  await enLaPestana(page, 'Tarjeta')
  await page.getByRole('tab', { name: 'Tablas', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${ORIGENES}/${id}/tablas$`))
  await enLaPestana(page, 'Tablas')
  // El origen del spec no tiene tablas: la pestaña dibuja su vacío (con tablas, la lista; `configuracion-cotizacion-tablas.spec.ts`).
  await expect(page.getByText(`${conFormula.nombre} no tiene tablas de referencia.`)).toBeVisible()
})

test('E2E escritorio · Catálogos › Colores, Niveles y Vigencia, por el menú', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`${CATALOGOS}/colores`)
  await enElCatalogo(
    page,
    new RegExp(`${CATALOGOS}/colores$`),
    'Colores',
    'Los colores de la hoja y de la tarjeta, para toda la empresa.',
  )
  await menu(page).getByRole('link', { name: 'Niveles', exact: true }).click()
  await enElCatalogo(
    page,
    new RegExp(`${CATALOGOS}/niveles$`),
    'Niveles',
    'Quién ve y edita qué celdas.',
  )
  await menu(page).getByRole('link', { name: 'Vigencia', exact: true }).click()
  await enElCatalogo(
    page,
    new RegExp(`${CATALOGOS}/vigencia$`),
    'Vigencia',
    'Cuántos días vale una cotización.',
  )
})

test('E2E escritorio · quien configura un origen no abre uno ajeno, y en Catálogos Niveles va apagada', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`${ORIGENES}/${conFormula.id}/formula/hoja`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver los orígenes' })).toHaveAttribute(
    'href',
    ORIGENES,
  )
  await page.goto(`${ORIGENES}/${sinFormula.id}/formula/hoja`)
  await enLaPestana(page, 'Hoja')
  await page.goto(`${ORIGENES}/no-es-un-origen/tablas`)
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
  await page.goto(`${CATALOGOS}/niveles`)
  await expect(page).toHaveURL(new RegExp(`${CATALOGOS}/colores$`))
  await expect(page.getByRole('heading', { name: 'Colores', level: 1 })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Niveles', exact: true })).toHaveCount(0)
  await expect(menu(page).getByText('Te falta el permiso «Ver roles».')).toBeVisible()
})

test('E2E escritorio · quien sólo ve los roles abre sólo Catálogos › Niveles', async ({ page }) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(CATALOGOS)
  await expect(page).toHaveURL(new RegExp(`${CATALOGOS}/niveles$`))
  await expect(page.getByRole('heading', { name: 'Niveles', level: 1 })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Colores', exact: true })).toHaveCount(0)
  await expect(menu(page).getByRole('link', { name: 'Vigencia', exact: true })).toHaveCount(0)
  await page.goto(`${ORIGENES}/${conFormula.id}/formula`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver los orígenes' })).toHaveCount(0)
})
