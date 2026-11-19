import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { leerElPdf } from './soporte/cotizar-pdf'
import {
  celdaEnPar,
  hermanasDe,
  limpiarHermanas,
  PRECIO,
  prepararHermanas,
  tipearEn,
  totalDe,
  TRANSPORTE,
} from './soporte/cotizar-hermanas'

// Cotizar en par con cotizaciones hermanas (glosario: «Variante en par» y «Cotizaciones hermanas»; `docs/UX.md` › «Cotizar» y «Cotización guardada»): con una
// variante de dos opciones que se cotiza en par, la hoja no dibuja sus chips, dibuja «Transporte · 20 pies» | «Transporte · 40 pies» y lo común una vez, con los
// dos totales; guardar crea dos cotizaciones que se enlazan; guardar una guarda las dos; la papelera y marcar final se llevan a la hermana.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let vehiculo = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead, vehiculo } = await prepararHermanas(info.project.name))
})

test.afterAll(async () => {
  await limpiarHermanas()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })
const sinEspacios = (texto: string) => texto.replace(/\s/g, '')
const conTotal = async (page: Page, opcion: string, valor: number) => {
  await expect(async () => {
    expect(sinEspacios((await totalDe(page, opcion).textContent()) ?? '')).toContain(
      sinEspacios(usd(valor)),
    )
  }).toPass()
}
const abrirLaHoja = (page: Page) =>
  page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}&vehiculo=${vehiculo}`)

test('E1 la hoja en par: sin chips de la variante, la línea de las dos versiones, cada celda que cambia en dos y los dos totales', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaHoja(page)
  await expect(page.getByText('Dos versiones: 20 pies y 40 pies.')).toBeVisible()
  await expect(page.locator('[data-nodo="contenedor"]')).toHaveCount(0)
  await expect(celdaEnPar(page, 'transporte', 'c20')).toContainText('Transporte · 20 pies')
  await expect(celdaEnPar(page, 'transporte', 'c40')).toContainText('Transporte · 40 pies')
  await expect(page.locator('[data-nodo="precio"]')).toHaveCount(1)
  await conTotal(page, 'c20', PRECIO + TRANSPORTE.c20)
  await conTotal(page, 'c40', PRECIO + TRANSPORTE.c40)
  await expect(page.getByText('Total · 20 pies', { exact: true }).first()).toBeVisible()
  // El tope de la hoja (500 nodos, `docs/RENDIMIENTO.md`): la celda gemela suma los nodos de una celda, ninguno más.
  const nodos = await page
    .locator('[data-hoja]')
    .evaluate((e) => e.querySelectorAll('*').length + 1)
  test
    .info()
    .annotations.push({ type: 'medida', description: `nodos de la hoja en par: ${String(nodos)}` })
  expect(nodos).toBeLessThanOrEqual(500)
})

test('E2 lo común vale para las dos; lo de una celda en par, sólo para su opción', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaHoja(page)
  await tipearEn(page.locator('[data-nodo="precio"]'), '20000')
  await conTotal(page, 'c20', 20000 + TRANSPORTE.c20)
  await conTotal(page, 'c40', 20000 + TRANSPORTE.c40)
  await tipearEn(celdaEnPar(page, 'transporte', 'c40'), '3000')
  await conTotal(page, 'c40', 23000)
  await conTotal(page, 'c20', 20000 + TRANSPORTE.c20)
})

test('E3 guardar crea las dos hermanas, que se enlazan', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaHoja(page)
  await tipearEn(celdaEnPar(page, 'transporte', 'c40'), '2500')
  await conTotal(page, 'c40', PRECIO + 2500)
  await page.keyboard.press('ControlOrMeta+s')
  await expect(
    page.getByRole('heading', {
      name: /Se guardaron las dos: n\.º \d+ \(20 pies\) y n\.º \d+ \(40 pies\)\./,
    }),
  ).toBeVisible()
  const [a, b] = hermanasDe(origen.id)
  expect(a?.hermana).toBe(b?.id)
  expect(b?.hermana).toBe(a?.id)
  expect([a?.opcion, b?.opcion]).toEqual(['c20', 'c40'])
  expect([a?.titulo, b?.titulo]).toEqual(['E2E Hilux 2020 · 20 pies', 'E2E Hilux 2020 · 40 pies'])
  await page.getByRole('link', { name: 'Abrir la de 20 pies' }).click()
  await page.getByRole('link', { name: 'Ver la de 40 pies' }).click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${b?.id ?? ''}`))
  await expect(page.getByRole('link', { name: 'Ver la de 20 pies' })).toBeVisible()
  // La guardada de una hermana abre las dos juntas, cada una con lo suyo.
  await conTotal(page, 'c40', PRECIO + 2500)
  await conTotal(page, 'c20', PRECIO + TRANSPORTE.c20)
})

test('E4 en la guardada, guardar una guarda las dos', async ({ page }) => {
  const [a, b] = hermanasDe(origen.id)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${b?.id ?? ''}`)
  // Lo común (el precio) cambia en las dos; lo de una celda en par, sólo en la suya. Una hermana sin cambios no se reescribe.
  await tipearEn(page.locator('[data-nodo="precio"]:visible'), '11000')
  await tipearEn(celdaEnPar(page, 'transporte', 'c20'), '1800')
  await conTotal(page, 'c20', 11000 + 1800)
  await conTotal(page, 'c40', 11000 + 2500)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  const [a2, b2] = hermanasDe(origen.id)
  expect(a2?.version).not.toBe(a?.version)
  expect(b2?.version).not.toBe(b?.version)
})

test('E5 la vista previa y el PDF traen las dos tarjetas', async ({ page }) => {
  const [a] = hermanasDe(origen.id)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${a?.id ?? ''}`)
  await page
    .getByRole('complementary', { name: 'Resumen' })
    .getByRole('button', { name: 'Vista previa' })
    .click()
  const dialogo = page.getByRole('dialog', { name: 'Vista previa' })
  await expect(dialogo.locator('[data-tarjeta-de-cotizacion]')).toHaveCount(2)
  await expect(dialogo.getByRole('region', { name: 'Tarjeta de 40 pies' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  const pdf = await leerElPdf(page, a?.id ?? '')
  expect(pdf.leido.paginas).toHaveLength(2)
})

test('E6 enviar una a la papelera manda las dos; «Deshacer» devuelve las dos', async ({ page }) => {
  const [a] = hermanasDe(origen.id)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${a?.id ?? ''}`)
  await page.getByRole('button', { name: 'Enviar a la papelera' }).click()
  await expect(page.getByText('Se enviaron 2 a la papelera.')).toBeVisible()
  const enviadas = hermanasDe(origen.id)
  expect(enviadas.every((c) => c.eliminada)).toBe(true)
  expect(new Set(enviadas.map((c) => c.lote)).size).toBe(1)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(() => hermanasDe(origen.id).every((c) => !c.eliminada)).toBe(true)
})

test('E7 marcar final una manda la otra a la papelera', async ({ page }) => {
  const [a, b] = hermanasDe(origen.id)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${a?.id ?? ''}`)
  await page.getByRole('button', { name: 'Marcar final' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Marcar final' }).click()
  await expect.poll(() => hermanasDe(origen.id).find((c) => c.id === a?.id)?.clase).toBe('final')
  expect(hermanasDe(origen.id).find((c) => c.id === b?.id)?.eliminada).toBe(true)
})
