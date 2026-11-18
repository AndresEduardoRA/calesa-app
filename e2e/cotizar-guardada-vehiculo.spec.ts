import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { esperarDosCuadros } from './soporte/barra-de-filtros'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import {
  crearVehiculoDePrueba,
  guardarPorLaHoja,
  publicarConTablaViva,
} from './soporte/cotizar-guardada'
import { limpiarGuardado, prepararGuardado, totalDeLaHoja } from './soporte/cotizar-guardar'
import { barraDelVehiculo, campoDelTitulo, panelDelVehiculo } from './soporte/cotizar-titulo'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Cambiar el vehículo de una preventa guardada (T315, `docs/UX.md` › «Cotización guardada»): en `/cotizaciones/[id]` quien la puede guardar elige otro vehículo en el panel de
// cotizar (sin «Quitar»), la hoja recalcula con él sin guardar, «Guardar» lo manda y la revisión dice «Cambió el vehículo: A → B». La aprobada se reacomoda con la regla de
// siempre; un título manual se respeta; una final no cambia de vehículo; uno que ya no se puede usar lo dice con «Elegir otro vehículo».
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let vera = ''
const vehiculos = { a: '', b: '', c: '', papelera: '' }
const titulos = { a: '', b: '', c: '', papelera: '' }
// c1: la primera de A (su aprobada); c0: otra de A; b1: la primera de B (su aprobada).
const cotizaciones = { c1: '', c0: '', b1: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'vehiculo'))
  // El total suma un factor de una tabla que casa por el año del vehículo: A (2018) y B (2020) dan totales distintos.
  publicarConTablaViva(origen.id, 22)
  titulos.a = `Toyota Corolla cambio ${proyecto}`
  titulos.b = `Mazda Tres cambio ${proyecto}`
  titulos.c = `Nissan Frontier cambio ${proyecto}`
  titulos.papelera = `Kia Rio papelera ${proyecto}`
  vehiculos.a = crearVehiculoDePrueba(origen.id, titulos.a, 2018)
  vehiculos.b = crearVehiculoDePrueba(origen.id, titulos.b, 2020)
  vehiculos.c = crearVehiculoDePrueba(origen.id, titulos.c, 2019)
  vehiculos.papelera = crearVehiculoDePrueba(origen.id, titulos.papelera, 2019)
  sql(
    `update public.vehiculos set eliminado_en = now() where id = ${literal(vehiculos.papelera)}::uuid`,
  )
  // Vera ve todas las cotizaciones y sólo los vehículos que creó (B): A es «un vehículo que no puedes ver».
  vera = correoDePrueba(`vera-vehiculo-${proyecto}`)
  await crearPersona({ email: vera, contrasena: CONTRASENA, nombre: 'Vera Propia', invitada: true })
  await darRolDePrueba({
    email: vera,
    rol: { nombre: `${PREFIJO_ROL_E2E}Vehículos propios`, clave: 'e2e_vehiculos_propios' },
    permisos: ['cotizaciones.ver', { clave: 'vehiculos.ver', alcance: 'propios' }],
  })
  sql(
    `update public.vehiculos set creado_por = ${literal(idDePersona(vera))}::uuid where id = ${literal(vehiculos.b)}::uuid`,
  )
})

test.afterAll(async () => {
  sql(`delete from public.cotizaciones where origen_id = ${literal(origen.id)}::uuid`)
  sql(`delete from public.vehiculos where origen_id = ${literal(origen.id)}::uuid`)
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const aprobadaDe = (vehiculo: string): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculo)}::uuid), '')`,
  )

const tarjetaDelPanel = (page: Page, texto: string) =>
  panelDelVehiculo(page)
    .getByRole('list', { name: 'Vehículos' })
    .getByRole('listitem')
    .filter({ hasText: texto })
    .getByRole('button')

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar', exact: true })

// Abre el panel desde la barra, busca el vehículo y lo elige: la URL lleva `?vehiculo=` y el panel se cierra.
async function elegirEnElPanel(page: Page, titulo: string, id: string) {
  await barraDelVehiculo(page).click()
  await panelDelVehiculo(page).getByRole('searchbox').fill(titulo)
  await tarjetaDelPanel(page, titulo).click()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${id}`))
  await expect(panelDelVehiculo(page)).toBeHidden()
}

test('E2E elegir otro vehículo en una preventa guardada recalcula la hoja y el título automático pasa al nuevo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  cotizaciones.c1 = await guardarPorLaHoja(page, {
    origenId: origen.id,
    lead,
    pub: '1200',
    vehiculoId: vehiculos.a,
  })
  cotizaciones.c0 = await guardarPorLaHoja(page, {
    origenId: origen.id,
    lead,
    pub: '900',
    vehiculoId: vehiculos.a,
  })
  cotizaciones.b1 = await guardarPorLaHoja(page, {
    origenId: origen.id,
    lead,
    pub: '700',
    vehiculoId: vehiculos.b,
  })
  expect(aprobadaDe(vehiculos.a)).toBe(cotizaciones.c1)
  expect(aprobadaDe(vehiculos.b)).toBe(cotizaciones.b1)

  await page.goto(`/cotizaciones/${cotizaciones.c1}`)
  await expect(barraDelVehiculo(page)).toContainText(titulos.a)
  await expect(guardar(page)).toBeDisabled()
  const totalConA = (await totalDeLaHoja(page).textContent()) ?? ''
  await capturar(page, info, 'guardada-antes')
  await barraDelVehiculo(page).click()
  // El panel de cotizar: buscador, listas y alta, sin «Quitar».
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toBeVisible()
  await expect(panelDelVehiculo(page).getByRole('region', { name: 'Elegido' })).toContainText(
    titulos.a,
  )
  await expect(panelDelVehiculo(page).getByRole('button', { name: 'Quitar' })).toHaveCount(0)
  await capturar(page, info, 'panel-de-la-preventa')
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo(page)).toBeHidden()

  await elegirEnElPanel(page, titulos.b, vehiculos.b)
  await expect(barraDelVehiculo(page)).toContainText(titulos.b)
  await expect(totalDeLaHoja(page)).not.toHaveText(totalConA)
  await expect(guardar(page)).toBeEnabled()
  await capturar(page, info, 'guardada-con-otro-vehiculo')
  // Nada se guardó todavía.
  expect(
    sql(`select vehiculo_id from public.cotizaciones where id = ${literal(cotizaciones.c1)}::uuid`),
  ).toBe(vehiculos.a)
})

test('E2E guardar deja la cotización con el vehículo nuevo, «Cambió el vehículo: A → B» y la aprobada reacomodada', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  // Lo elegido vive en la URL: recargar (o un enlace) lo conserva.
  await page.goto(`/cotizaciones/${cotizaciones.c1}?vehiculo=${vehiculos.b}`)
  await expect(barraDelVehiculo(page)).toContainText(titulos.b)
  await guardar(page).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(barraDelVehiculo(page)).toContainText(titulos.b)
  expect(
    sql(
      `select vehiculo_id || '|' || titulo || '|' || titulo_manual::text from public.cotizaciones where id = ${literal(cotizaciones.c1)}::uuid`,
    ),
  ).toBe(`${vehiculos.b}|${titulos.b}|false`)
  // A queda con su otra activa; B conserva la suya y c1 llega sin marca.
  expect(aprobadaDe(vehiculos.a)).toBe(cotizaciones.c0)
  expect(aprobadaDe(vehiculos.b)).toBe(cotizaciones.b1)

  await page.getByRole('button', { name: 'Revisiones' }).click()
  const revisiones = page.getByRole('dialog', { name: /^Revisiones de la cotización/ })
  await expect(revisiones).toContainText(`Cambió el vehículo: ${titulos.a} → ${titulos.b}`)
  await capturar(page, info, 'revision-con-nombres')
})

test('E2E un título manual se respeta al cambiar de vehículo; uno sin aprobada la recibe', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizaciones.c0}`)
  await barraDelVehiculo(page).click()
  await campoDelTitulo(page).fill('Para Juan Pérez')
  await esperarDosCuadros(page)
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo(page)).toBeHidden()
  await elegirEnElPanel(page, titulos.c, vehiculos.c)
  await expect(barraDelVehiculo(page)).toContainText('Para Juan Pérez')
  await expect(barraDelVehiculo(page)).toContainText(titulos.c)
  await guardar(page).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  expect(
    sql(
      `select vehiculo_id || '|' || titulo || '|' || titulo_manual::text from public.cotizaciones where id = ${literal(cotizaciones.c0)}::uuid`,
    ),
  ).toBe(`${vehiculos.c}|Para Juan Pérez|true`)
  // C no tenía cotizaciones: c0 llega aprobada; A se queda sin ninguna.
  expect(aprobadaDe(vehiculos.c)).toBe(cotizaciones.c0)
  expect(aprobadaDe(vehiculos.a)).toBe('')
})

test('E2E quien no ve el vehículo de antes lee «un vehículo que no puedes ver» en la revisión', async ({
  page,
}) => {
  await entrar(page, vera, { fresco: true })
  await page.goto(`/cotizaciones/${cotizaciones.c1}`)
  await page.getByRole('button', { name: 'Revisiones' }).click()
  await expect(page.getByRole('dialog', { name: /^Revisiones de la cotización/ })).toContainText(
    `Cambió el vehículo: un vehículo que no puedes ver → ${titulos.b}`,
  )
})

test('E2E un vehículo que no se puede usar lo dice bajo la barra y «Elegir otro vehículo» abre el panel', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizaciones.b1}?vehiculo=${vehiculos.papelera}`)
  await expect(page.getByText('No se puede usar ese vehículo.', { exact: true })).toBeVisible()
  await expect(barraDelVehiculo(page)).toContainText(titulos.b)
  await capturar(page, info, 'vehiculo-no-usable')
  await page.getByRole('button', { name: 'Elegir otro vehículo' }).click()
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toBeVisible()
})

test('E2E una final no cambia de vehículo: el panel lo dice, sin buscador', async ({
  page,
}, info) => {
  sql(`update public.cotizaciones set clase = 'final' where id = ${literal(cotizaciones.b1)}::uuid`)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizaciones.b1}`)
  await barraDelVehiculo(page).click()
  await expect(panelDelVehiculo(page)).toContainText('Una cotización final no cambia de vehículo.')
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toHaveCount(0)
  await capturar(page, info, 'panel-de-la-final')
})
