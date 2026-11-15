import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { panelAgregar } from './soporte/leads-vehiculos'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «Relacionados» (T17, `docs/UX.md` › «Relacionados»): el mismo bloque arriba de cada detalle. Desde la ficha del vehículo, su resumen del inventario y la unidad de logística se ven
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

// Lo mismo desde cualquier detalle de ese vehículo: cada lead en su tipo, con su leyenda.
async function ven(raiz: Page | Locator) {
  await expect(bloque(raiz)).toBeVisible()
  await expect(grupo(raiz, 'Vinculado').getByText(nombres.a)).toBeVisible()
  await expect(
    grupo(raiz, 'Vinculado').getByText('El lead dueño o comprador de este vehículo.'),
  ).toBeVisible()
  await expect(grupo(raiz, 'Interesado').getByText(nombres.b)).toBeVisible()
  await expect(grupo(raiz, 'Interesado').getByText('Lo quiere en blanco')).toBeVisible()
  await expect(
    grupo(raiz, 'Interesado').getByText('Leads que mostraron interés en este vehículo.'),
  ).toBeVisible()
  await expect(grupo(raiz, 'Cotizado').getByText(nombres.c)).toBeVisible()
  await expect(
    grupo(raiz, 'Cotizado').getByText('Leads con una cotización activa de este vehículo.'),
  ).toBeVisible()
}

test('E2E la ficha del vehículo, su resumen y la unidad de logística muestran los mismos relacionados', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.principal}`)
  await expect(page.getByRole('heading', { name: titulos.principal, level: 1 })).toBeVisible()
  await ven(page)
  await capturar(page, info, 'ficha-del-vehiculo')

  await page.goto(`/vehiculos?origen=${origen.id}&vehiculo=${vehiculos.principal}`)
  const resumen = page.getByRole('dialog', { name: titulos.principal, exact: true })
  await expect(resumen).toBeVisible()
  await ven(resumen)
  await capturar(page, info, 'resumen-del-vehiculo')

  await page.goto(`/logistica/vehiculo/${vehiculos.principal}`)
  await ven(page)
  await capturar(page, info, 'unidad-de-logistica')
})

test('E2E la ficha de cada lead muestra el vehículo en su tipo, y vincular desde el lead aparece en el vehículo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/leads/${leads.a}`)
  await expect(grupo(page, 'Vinculado').getByText(titulos.principal)).toBeVisible()
  await expect(
    grupo(page, 'Vinculado').getByText('Vehículos de los que este lead es dueño o comprador.'),
  ).toBeVisible()
  await page.goto(`/leads/${leads.b}`)
  await expect(grupo(page, 'Interesado').getByText(titulos.principal)).toBeVisible()
  await page.goto(`/leads/${leads.c}`)
  await expect(grupo(page, 'Cotizado').getByText(titulos.principal)).toBeVisible()
  await capturar(page, info, 'ficha-del-lead')

  // Vincular o marcar un vehículo desde el lead D: el enlace abre el panel de la sección «Vehículos» y el vínculo aparece en la ficha del vehículo.
  await page.goto(`/leads/${leads.d}`)
  await expect(bloque(page).getByText('Sin relacionados todavía.')).toBeVisible()
  await bloque(page).getByRole('link', { name: 'Vincular o marcar un vehículo' }).click()
  await expect(page).toHaveURL(
    /seccion=vehiculos.*panel=agregar-vehiculo|panel=agregar-vehiculo.*seccion=vehiculos/,
  )
  const panel = panelAgregar(page)
  await expect(panel).toBeVisible()
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
  await bloque(page).getByRole('button', { name: 'Marcar un interesado' }).click()
  await expect(page).toHaveURL(/panel=marcar-interesado/)
  const selector = page.getByRole('dialog', { name: 'Marcar un interesado' })
  await expect(selector).toBeVisible()
  await capturar(page, info, 'selector-de-leads')
  await selector.getByText(nombres.e).first().click()
  await expect(selector).toBeHidden()
  await expect(grupo(page, 'Interesado').getByText(nombres.e)).toBeVisible()
  await page.goto(`/leads/${leads.e}`)
  await expect(grupo(page, 'Interesado').getByText(titulos.otro)).toBeVisible()
})
