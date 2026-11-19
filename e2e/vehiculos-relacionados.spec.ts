import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { abrirAgregarVehiculo, relacionadosDelLead } from './soporte/leads-vehiculos'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «Relacionados» (T17, `docs/UX.md` › «Relacionados»): el mismo bloque arriba de cada detalle. Desde la ficha del vehículo y la unidad de logística se ven
// el mismo Vinculado (A), Interesado (B) y Cotizado (C) con sus leyendas; la ficha del lead muestra el vehículo en cada tipo; y vincular o marcar desde un lado aparece en el otro.
test.describe.configure({ mode: 'serial' })

let sufijo = ''
let origen = { id: '', nombre: '' }
let duena = ''
const vehiculos = { principal: '', libre: '', otro: '' }
const titulos = { principal: '', libre: '', otro: '' }
const leads = { a: '', b: '', c: '', d: '', e: '' }
const nombres = { a: '', b: '', c: '', d: '', e: '' }

function crearVehiculo(titulo: string): string {
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(titulo)})`,
  )
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(titulo)}`,
  )
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  sufijo = proyecto === 'movil' ? 'M' : 'E'
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'relac'))
  const telefono = (n: number) => `5917${String(Date.now() + n).slice(-7)}`
  for (const [n, clave] of (['a', 'b', 'c', 'd', 'e'] as const).entries()) {
    const nombre = `Relac ${clave.toUpperCase()} ${sufijo}`
    nombres[clave] = `E2E ${nombre}`
    leads[clave] = await crearLead({ nombre, telefono: telefono(n), deQuien: duena })
  }
  for (const clave of ['principal', 'libre', 'otro'] as const) {
    titulos[clave] = `Relacionados ${clave} ${sufijo}`
    vehiculos[clave] = crearVehiculo(titulos[clave])
  }
  // El vehículo principal: A lo tiene vinculado, a B le interesa (con su nota) y C tiene una cotización activa.
  await vincular(vehiculos.principal, leads.a)
  await marcarInteres({
    vehiculoId: vehiculos.principal,
    leadId: leads.b,
    quien: duena,
    nota: 'Lo quiere en blanco',
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.principal,
    leadId: leads.c,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const bloque = (raiz: Page | Locator) => raiz.getByRole('region', { name: 'Relacionados' })
const grupo = (raiz: Page | Locator, nombre: string) =>
  bloque(raiz).getByRole('region', { name: nombre, exact: true })
const grupoDelLead = (page: Page, nombre: string) =>
  relacionadosDelLead(page).getByRole('region', { name: nombre, exact: true })

// La ficha del vehículo (compacta): cada lead en su tipo, a la vista; la leyenda no se ve, es la descripción del grupo para el lector.
async function venEnLaFicha(page: Page) {
  await expect(bloque(page)).toBeVisible()
  await expect(grupo(page, 'Vinculado').getByText(nombres.a)).toBeVisible()
  await expect(grupo(page, 'Vinculado')).toHaveAccessibleDescription(
    'El lead dueño o comprador de este vehículo.',
  )
  await expect(grupo(page, 'Interesado').getByText(nombres.b)).toBeVisible()
  await expect(grupo(page, 'Interesado').getByText('Lo quiere en blanco')).toBeVisible()
  await expect(grupo(page, 'Interesado')).toHaveAccessibleDescription(
    'Leads que mostraron interés en este vehículo.',
  )
  await expect(grupo(page, 'Cotizado').getByText(nombres.c)).toBeVisible()
  await expect(grupo(page, 'Cotizado')).toHaveAccessibleDescription(
    'Leads con una cotización activa de este vehículo.',
  )
}

// La unidad de logística los dice en una línea de chips («Vinculado · n»…): cada chip abre su grupo en un popover con las mismas filas y leyenda.
async function venEnLinea(page: Page, raiz: Page | Locator) {
  const linea = bloque(raiz)
  await expect(linea).toBeVisible()
  await expect(linea.getByRole('heading')).toHaveCount(0)
  const grupos = [
    ['Vinculado', nombres.a, 'El lead dueño o comprador de este vehículo.'],
    ['Interesado', nombres.b, 'Lo quiere en blanco'],
    ['Cotizado', nombres.c, null],
  ] as const
  for (const [nombre, lead, leyenda] of grupos) {
    await linea.getByRole('button', { name: new RegExp(`^${nombre} · \\d`) }).click()
    const popover = page.getByRole('dialog', { name: `Relacionados: ${nombre}` })
    await expect(popover.getByText(lead)).toBeVisible()
    if (leyenda) await expect(popover.getByText(leyenda)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover).toBeHidden()
  }
}

test('E2E la ficha del vehículo y la unidad de logística muestran los mismos relacionados', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.principal}`)
  await expect(page.getByRole('heading', { name: titulos.principal, level: 1 })).toBeVisible()
  await venEnLaFicha(page)
  await capturar(page, info, 'ficha-del-vehiculo')

  await page.goto(`/logistica/vehiculo/${vehiculos.principal}`)
  await venEnLinea(page, page)
  await capturar(page, info, 'unidad-de-logistica')
})

test('E2E la ficha de cada lead muestra el vehículo en su tipo, y vincular desde el lead aparece en el vehículo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  // En la ficha del lead, «Relacionados» es el bloque «Vehículos».
  await page.goto(`/leads/${leads.a}`)
  await expect(grupoDelLead(page, 'Vinculado').getByText(titulos.principal)).toBeVisible()
  await expect(grupoDelLead(page, 'Vinculado')).toHaveAccessibleDescription(
    'Vehículos de los que este lead es dueño o comprador.',
  )
  await page.goto(`/leads/${leads.b}`)
  await expect(grupoDelLead(page, 'Interesado').getByText(titulos.principal)).toBeVisible()
  await page.goto(`/leads/${leads.c}`)
  await expect(grupoDelLead(page, 'Cotizado').getByText(titulos.principal)).toBeVisible()
  await capturar(page, info, 'ficha-del-lead')

  // Vincular o marcar un vehículo desde el lead D: en la ficha del lead el bloque se llama «Vehículos» y su título abre el panel; el vínculo aparece en
  // la ficha del vehículo.
  await page.goto(`/leads/${leads.d}`)
  await expect(relacionadosDelLead(page).getByText('Sin vehículos.')).toBeVisible()
  const panel = await abrirAgregarVehiculo(page)
  await panel.getByLabel('Buscar por título, VIN, lote o número').fill(titulos.libre)
  await panel.getByRole('radio', { name: new RegExp(titulos.libre) }).check()
  await panel.getByRole('button', { name: 'Vincular', exact: true }).click()
  await expect(panel).toBeHidden()
  await page.goto(`/vehiculos/${vehiculos.libre}`)
  await expect(grupo(page, 'Vinculado').getByText(nombres.d)).toBeVisible()
})

test('E2E marcar un interesado desde el vehículo con el selector aparece en la ficha del lead', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.otro}`)
  await expect(bloque(page).getByText('Sin relacionados todavía.')).toBeVisible()
  // Con todo vacío se ve una acción («Vincular a un lead»); marcar un interesado está en el «⋯» del bloque.
  await expect(bloque(page).getByRole('button', { name: 'Vincular a un lead' })).toBeVisible()
  await bloque(page).getByRole('button', { name: 'Más acciones de «Relacionados»' }).click()
  await page.getByRole('menuitem', { name: 'Marcar un interesado' }).click()
  await expect(page).toHaveURL(/panel=marcar-interesado/)
  const selector = page.getByRole('dialog', { name: 'Marcar un interesado' })
  await expect(selector).toBeVisible()
  await capturar(page, info, 'selector-de-leads')
  await selector.getByText(nombres.e).first().click()
  await expect(selector).toBeHidden()
  await expect(grupo(page, 'Interesado').getByText(nombres.e)).toBeVisible()
  await page.goto(`/leads/${leads.e}`)
  await expect(grupoDelLead(page, 'Interesado').getByText(titulos.otro)).toBeVisible()
})
