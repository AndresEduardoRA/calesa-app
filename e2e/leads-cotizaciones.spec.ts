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
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// El bloque «Cotizaciones» de la ficha del lead (`docs/UX.md` › «Lead»): lo ve quien tiene `cotizaciones.ver` en algún origen (sin mirar la cartera). El título con
// «Cotizar» lo dibuja el servidor; las filas se leen desde el navegador al acercarse: las 3 más recientes y «Ver todas» (`/cotizaciones?lead=`) si hay más. Con la RLS
// de quien mira.

// La primera (y única) respuesta: 4 filas (3 y una de más para saber si hay otra). Con 20 eran ≤ 5.250 B.
const TOPE_DE_BYTES = 1_500

let origen = { id: '', nombre: '' }
let duena = ''
let sinClave = ''
let ana = ''
const leads: Record<'cinco' | 'tres' | 'ninguna' | 'compartido', string> = {
  cinco: '',
  tres: '',
  ninguna: '',
  compartido: '',
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'leadcotiz'))
  const nuevo = (nombre: string) =>
    crearLead({ nombre: `${nombre} ${proyecto}`, telefono: telefonoAlAzar(), deQuien: duena })
  leads.cinco = await nuevo('cotiz cinco')
  leads.tres = await nuevo('cotiz tres')
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
  sembrarCotizaciones({ ...base, leadId: leads.cinco, cuantas: 5 })
  sembrarCotizaciones({ ...base, leadId: leads.tres, cuantas: 3 })
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
const filas = (page: Page): Locator => lista(page).getByRole('listitem')
const verTodas = (page: Page): Locator => bloque(page).getByRole('link', { name: 'Ver todas' })

// Los pedidos del navegador a `cotizaciones` (el bloque lee desde el navegador; el servidor no lee cotizaciones para la ficha).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname === '/rest/v1/cotizaciones') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E1 la dueña: el título llega con la ficha, no se lee hasta acercarse, y trae las 3 más recientes con «Ver todas» al listado del lead', async ({
  page,
}) => {
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
  const respuesta = lejos
    ? page.waitForResponse((r) => new URL(r.url()).pathname === '/rest/v1/cotizaciones')
    : null
  const enlace = indice(page).getByRole('link', { name: 'Cotizaciones' })
  await enlace.click()
  await expect(titulo(page)).toBeFocused()
  await expect(enlace).toHaveAttribute('aria-current', 'location')
  await expect(filas(page)).toHaveCount(3)
  const bytes = respuesta ? (await (await respuesta).body()).length : 0
  expect(lecturas).toHaveLength(1)
  expect(lecturas[0]).toContain(`lead_id=eq.${leads.cinco}`)
  expect(lecturas[0]).toContain('limit=4')
  test.info().annotations.push({ type: 'medido', description: `bytes con 3: ${String(bytes)}` })
  if (respuesta) {
    expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
  }
  const masNueva = sql(
    `select numero from public.cotizaciones where lead_id = ${literal(leads.cinco)}::uuid order by creado_en desc, id desc limit 1`,
  )
  await expect(filas(page).first()).toContainText(`N.º ${masNueva}`)
  await expect(filas(page).first().getByRole('link')).toHaveAttribute(
    'href',
    /^\/cotizaciones\/[0-9a-f-]{36}$/,
  )
  await expect(bloque(page).getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  await expect(verTodas(page)).toHaveAttribute('href', `/cotizaciones?lead=${leads.cinco}`)
  expect(lecturas).toHaveLength(1)
  await verTodas(page).click()
  await expect(page).toHaveURL(/\/cotizaciones\?lead=/)
})

test('E2 con exactamente 3: las tres, sin «Ver todas»', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/leads/${leads.tres}?seccion=cotizaciones`)
  await expect(filas(page)).toHaveCount(3)
  await expect(verTodas(page)).toHaveCount(0)
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
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(lista(page)).not.toContainText('Gala Guarda')
  await expect(verTodas(page)).toHaveCount(0)
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
