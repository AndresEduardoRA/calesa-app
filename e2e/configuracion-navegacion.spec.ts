// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el selector del celular se mira en el recorrido de la IA
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './soporte/origenes'

// La navegación de Configuración: desde cada sección se vuelve al inicio con «‹ Configuración», el menú de Configuración marca la sección
// actual y salta a otra, quien sólo configura los leads ve sólo «Ventas › Leads», y el inicio dice lo que falta con su enlace al paso.

let duena = ''
let soloLeads = ''
let cotizadora = ''
let proyecto = ''
let origen = { id: '', nombre: '' }
const claveDelOrigen = () => `navegacion_${proyecto}`

async function borrarLoMio() {
  await admin().from('origenes').delete().eq('clave', `${PREFIJO_CLAVE_E2E}${claveDelOrigen()}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-navegacion-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Nina Navega' })
  soloLeads = correoDePrueba(`leads-navegacion-${proyecto}`)
  await crearPersona({
    email: soloLeads,
    contrasena: CONTRASENA,
    nombre: 'Lola Leads',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloLeads,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sólo leads ${proyecto}`,
      clave: `e2e_solo_leads_${proyecto}`,
    },
    permisos: ['leads.configurar'],
  })
  // Nace sin fórmula publicada. Quien configura el cotizador sólo en él ve sólo su falta: las de los orígenes de otros specs, no.
  origen = await crearOrigenDePrueba(`E2E Navega ${proyecto}`, claveDelOrigen())
  cotizadora = correoDePrueba(`cotiza-navegacion-${proyecto}`)
  await crearPersona({
    email: cotizadora,
    contrasena: CONTRASENA,
    nombre: 'Coti Navega',
    invitada: true,
  })
  await darRolDePrueba({
    email: cotizadora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Cotiza uno ${proyecto}`,
      clave: `e2e_cotiza_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: origen.id }],
  })
})

test.afterAll(async () => {
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })
const volver = (page: Page) =>
  page.getByRole('main').getByRole('link', { name: 'Configuración', exact: true })
const tituloDelInicio = (page: Page) =>
  page.getByRole('heading', { name: 'Configuración', level: 1 })

test('E2E desde cada sección del menú se vuelve al inicio de Configuración', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa')
  await expect(menu(page)).toBeVisible()
  const rutas = await menu(page)
    .getByRole('link')
    .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href') ?? ''))
  expect(rutas.length).toBeGreaterThanOrEqual(9)
  for (const ruta of rutas) {
    await page.goto(ruta)
    await expect(volver(page), ruta).toBeVisible()
    await volver(page).click()
    await expect(page).toHaveURL('/configuracion')
    await expect(tituloDelInicio(page)).toBeVisible()
    // En el inicio no van ni el menú ni la vuelta: las tarjetas son el menú.
    await expect(menu(page)).toHaveCount(0)
    await expect(volver(page)).toHaveCount(0)
  }
})

test('E2E el menú marca la sección actual y salta a otra', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  // Leads no tiene sub-sección índice: su ruta abre la primera sub-ruta. La sección queda marcada como la rama y la sub-sección, como la
  // página.
  await page.goto('/configuracion/leads')
  await expect(page).toHaveURL('/configuracion/leads/campos')
  const leads = menu(page).getByRole('link', { name: 'Leads', exact: true })
  const flujos = menu(page).getByRole('link', { name: 'Flujos', exact: true })
  await expect(leads).toHaveAttribute('aria-current', 'true')
  await expect(menu(page).getByRole('link', { name: 'Campos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(flujos).not.toHaveAttribute('aria-current')
  await flujos.click()
  await expect(page).toHaveURL(/\/configuracion\/flujos/)
  await expect(flujos).toHaveAttribute('aria-current', 'page')
  await expect(leads).not.toHaveAttribute('aria-current')
})

test('E2E con sólo configurar los leads se ve sólo «Ventas › Leads»', async ({ page }) => {
  await page.context().clearCookies()
  await entrar(page, soloLeads, { fresco: true })
  await page.goto('/configuracion/leads')
  await expect(page).toHaveURL('/configuracion/leads/origenes')
  // Un solo grupo: las demás listas del menú son las sub-secciones de Leads, sin nombre.
  await expect(menu(page).getByRole('list', { name: /./ })).toHaveCount(1)
  await expect(menu(page).getByRole('list', { name: 'Ventas' })).toBeVisible()
  // «Campos» pide otro permiso: va apagada, sin enlace.
  await expect(menu(page).getByRole('link')).toHaveText([
    'Leads',
    'Orígenes del lead',
    'Tipos de lead',
    'Tipos de seguimiento',
    'Plantilla del embudo',
    'Mensaje del portal',
    'Teléfonos extra',
  ])

  await volver(page).click()
  await expect(tituloDelInicio(page)).toBeVisible()
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Ventas'])
  await expect(main.getByRole('region', { name: 'Ventas' }).getByRole('link')).toHaveText(['Leads'])
})

test('E2E el inicio dice qué falta: la fórmula de un origen nuevo, con su enlace', async ({
  page,
}) => {
  await page.context().clearCookies()
  await entrar(page, cotizadora, { fresco: true })
  await page.goto('/configuracion')
  const ventas = page.getByRole('main').getByRole('region', { name: 'Ventas' })
  const falta = ventas.getByRole('link', {
    name: `Falta publicar la fórmula de ${origen.nombre}`,
    exact: true,
  })
  await expect(falta).toHaveAttribute('href', `/configuracion/cotizacion/${origen.id}/formula`)
  await falta.click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/cotizacion/${origen.id}/formula$`))
})
