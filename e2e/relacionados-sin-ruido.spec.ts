import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «Relacionados» sin ruido (`docs/UX.md` › «Relacionados (estados propios)»): en la unidad de logística, una línea de chips sin grupos vacíos; en las fichas, el bloque compacto sin leyendas a la
// vista, sin grupos vacíos y con las acciones en el «⋯». El vehículo V: A lo tiene vinculado, a B, C, D y E les interesa (4: hay «Ver todos») y no tiene cotizaciones; la dueña ve cotizaciones,
// así que Cotizado existe y está vacío.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let vehiculo = ''
let titulo = ''
const leads: Record<'a' | 'b' | 'c' | 'd' | 'e', string> = { a: '', b: '', c: '', d: '', e: '' }
const nombres: Record<keyof typeof leads, string> = { a: '', b: '', c: '', d: '', e: '' }
const LEYENDA_INTERESADO = 'Leads que mostraron interés en este vehículo.'

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  const sufijo = proyecto === 'movil' ? 'M' : 'E'
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'sinruido'))
  const telefono = (n: number) => `5917${String(Date.now() + n).slice(-7)}`
  for (const [n, clave] of (['a', 'b', 'c', 'd', 'e'] as const).entries()) {
    const nombre = `Sin ruido ${clave.toUpperCase()} ${sufijo}`
    nombres[clave] = `E2E ${nombre}`
    leads[clave] = await crearLead({ nombre, telefono: telefono(n), deQuien: duena })
  }
  titulo = `Sin ruido ${sufijo}`
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(titulo)})`,
  )
  vehiculo = sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(titulo)}`,
  )
  await vincular(vehiculo, leads.a)
  for (const clave of ['b', 'c', 'd', 'e'] as const) {
    await marcarInteres({ vehiculoId: vehiculo, leadId: leads[clave], quien: duena })
  }
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const bloque = (raiz: Page | Locator) => raiz.getByRole('region', { name: 'Relacionados' })
const grupo = (raiz: Page | Locator, nombre: string) =>
  bloque(raiz).getByRole('region', { name: nombre, exact: true })

test('E2E la unidad de logística muestra chips en una línea, sin grupos vacíos', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  // Las listas de vehículos y de leads no tienen resumen (abren la ficha): la línea de chips queda en logística.
  await page.goto(`/logistica/vehiculo/${vehiculo}`)
  const linea = bloque(page)
  const interesado = linea.getByRole('button', { name: /^Interesado · 4/ })
  await expect(linea.getByRole('button', { name: /^Vinculado · 1/ })).toBeVisible()
  await expect(interesado).toBeVisible()
  await expect(linea.getByRole('button', { name: /^Cotizado/ })).toHaveCount(0)
  await expect(linea.getByRole('heading')).toHaveCount(0)
  await expect(page.getByText(LEYENDA_INTERESADO)).toHaveCount(0)
  await capturar(page, info, 'unidad-linea')

  // El chip abre su grupo en un popover: Esc cierra sólo el popover.
  await interesado.click()
  const popover = page.getByRole('dialog', { name: 'Relacionados: Interesado' })
  await expect(popover.getByRole('listitem')).toHaveCount(3)
  await expect(popover.getByText(LEYENDA_INTERESADO)).toBeVisible()
  await capturar(page, info, 'popover-del-grupo')
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  await expect(interesado).toBeVisible()

  // «Ver todos» abre el drawer en la unidad, sin salir de ella (`?relacionados=`).
  await interesado.click()
  await popover.getByRole('button', { name: 'Ver todos' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/logistica/vehiculo/${vehiculo}\\?relacionados=interesado`),
  )
  const todos = page.getByRole('dialog', { name: 'Interesado · todos' })
  await expect(todos.getByRole('listitem')).toHaveCount(4)

  // Con el texto al 200 % la línea envuelve: sólo para mirar.
  await page.goto(`/logistica/vehiculo/${vehiculo}`)
  await expect(interesado).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await capturar(page, info, 'unidad-linea-200')
})

test('E2E la ficha dibuja el bloque compacto sin leyendas a la vista, sin grupos vacíos y con las acciones en el «⋯»', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculo}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  const interesados = grupo(page, 'Interesado')
  await expect(grupo(page, 'Vinculado').getByText(nombres.a)).toBeVisible()
  await expect(interesados.getByText(nombres.e)).toBeVisible()
  await expect(grupo(page, 'Cotizado')).toHaveCount(0)
  // La leyenda: el `title` del título y la descripción del grupo para el lector, no un texto a la vista.
  await expect(interesados.getByRole('heading', { name: /^Interesado · 4/ })).toHaveAttribute(
    'title',
    LEYENDA_INTERESADO,
  )
  await expect(interesados).toHaveAccessibleDescription(LEYENDA_INTERESADO)
  await expect(interesados.getByRole('button', { name: 'Marcar un interesado' })).toHaveCount(0)
  await capturar(page, info, 'ficha-vehiculo-compacta')

  // La acción del grupo, en su «⋯».
  await interesados.getByRole('button', { name: 'Más acciones de «Interesado»' }).click()
  await page.getByRole('menuitem', { name: 'Marcar un interesado' }).click()
  await expect(page).toHaveURL(/panel=marcar-interesado/)
  const selector = page.getByRole('dialog', { name: 'Marcar un interesado' })
  await expect(selector).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(selector).toBeHidden()

  // La del grupo que no se dibuja (Cotizado vacío) no se pierde: está en el «⋯» del bloque.
  await bloque(page).getByRole('button', { name: 'Más acciones de «Relacionados»' }).click()
  await expect(page.getByRole('menuitem', { name: 'Cotizar' })).toBeVisible()
  await page.keyboard.press('Escape')

  await interesados.getByRole('button', { name: 'Ver todos' }).click()
  const todos = page.getByRole('dialog', { name: 'Interesado · todos' })
  await expect(todos.getByRole('listitem')).toHaveCount(4)
  await page.keyboard.press('Escape')
  await expect(todos).toBeHidden()

  await page.goto(`/leads/${leads.a}`)
  await expect(grupo(page, 'Vinculado').getByText(titulo)).toBeVisible()
  await expect(grupo(page, 'Interesado')).toHaveCount(0)
  await capturar(page, info, 'ficha-lead-compacta')
})
