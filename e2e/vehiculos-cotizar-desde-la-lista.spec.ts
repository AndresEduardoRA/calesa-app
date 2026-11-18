import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { darRolDeLaSemilla } from './soporte/rol-de-la-semilla'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// «Cotizar vehículo» en el «⋯» de la fila del inventario (T335, `docs/UX.md` › «Vehículos»): con permiso para
// cotizar en el origen, lleva a la hoja con ese origen y ese vehículo y sin lead (guardar espera al cliente: 4.14-3); sin él, el «⋯» no lo ofrece.
test.describe.configure({ mode: 'serial' })

const TITULO = 'Lista para cotizar'
let origen = { id: '', nombre: '' }
let lectora = ''
let asesora = ''
let vehiculo = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen } = await prepararGuardado(proyecto, 'rescot'))
  // La dueña guarda sin lead (tiene `sin_lead`); quien no, y ve el motivo, es el Asesor de la semilla.
  asesora = correoDePrueba(`asesora-rescot-${proyecto}`)
  await crearPersona({
    email: asesora,
    contrasena: CONTRASENA,
    nombre: 'Ana Asesora',
    invitada: true,
  })
  await darRolDeLaSemilla(asesora, 'asesor')
  lectora = correoDePrueba(`lectora-rescot-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lee sin cotizar`, clave: 'e2e_lee_sin_cotizar' },
    permisos: [{ clave: 'vehiculos.ver', origenId: origen.id }],
  })
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(TITULO)})`,
  )
  vehiculo = sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(TITULO)}`,
  )
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

// La fila (escritorio) o la tarjeta (celular) del vehículo, buscada por su texto.
const filaDe = (page: Page) =>
  page.locator('tbody tr, li article').filter({ hasText: TITULO }).filter({ visible: true }).first()

async function alInventario(page: Page, correo: string): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`/vehiculos?origen=${origen.id}`)
  await expect(filaDe(page).getByRole('link', { name: TITULO, exact: true })).toBeVisible()
}

test('E2E «Cotizar vehículo» del «⋯» lleva a la hoja de ese origen con el vehículo en la barra, y «Guardar» dice por qué no', async ({
  page,
}) => {
  await alInventario(page, asesora)
  await filaDe(page)
    .getByRole('button', { name: `Más acciones de ${TITULO}` })
    .click()
  await page.getByRole('menu').getByRole('menuitem', { name: 'Cotizar vehículo' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/cotizaciones/nuevo\\?origen=${origen.id}&vehiculo=${vehiculo}`),
  )
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Vehículo:/ })).toContainText(TITULO)
  await expect(page.getByText('Para guardar, elige el cliente en «Cliente».')).toBeVisible()
})

test('E2E con «ver vehículos» y sin «crear cotizaciones», el «⋯» no ofrece «Cotizar vehículo»', async ({
  page,
}) => {
  await alInventario(page, lectora)
  // Sin nada que ofrecer, la fila no tiene «⋯».
  await expect(filaDe(page).getByRole('button', { name: `Más acciones de ${TITULO}` })).toHaveCount(
    0,
  )
  await expect(page.getByRole('menuitem', { name: 'Cotizar vehículo' })).toHaveCount(0)
})
