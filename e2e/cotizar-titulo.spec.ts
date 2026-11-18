import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esperarDosCuadros } from './soporte/barra-de-filtros'
import {
  crearVehiculoDePrueba,
  numeroDeLaCotizacion,
  urlDeLaHoja,
} from './soporte/cotizar-guardada'
import {
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { leerElPdf } from './soporte/cotizar-pdf'
import { barraDelVehiculo, campoDelTitulo, panelDelVehiculo } from './soporte/cotizar-titulo'
import { abrirLaVistaPrevia, dialogo } from './soporte/cotizar-vista-previa'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El título de la cotización (T307, `docs/UX.md` › «Cotizar», paso «Vehículo»): el campo «Título de la cotización» arriba del panel del vehículo, automático (el del
// vehículo) o manual; sin vehículo es obligatorio. Se ve en la barra, la lista, el resumen, la cabecera de la guardada, el PDF y «Copiar texto», y el listado lo busca.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let hilux = ''
let corolla = ''
let guardada = ''
let tituloHilux = ''
let tituloCorolla = ''
let titulo = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'titulo'))
  tituloHilux = `Toyota Hilux título ${proyecto}`
  tituloCorolla = `Toyota Corolla título ${proyecto}`
  hilux = crearVehiculoDePrueba(origen.id, tituloHilux)
  corolla = crearVehiculoDePrueba(origen.id, tituloCorolla)
  titulo = `Importación para Juan Pérez ${proyecto}`
})

test.afterAll(async () => {
  sql(`delete from public.cotizaciones where origen_id = ${literal(origen.id)}::uuid`)
  sql(`delete from public.vehiculos where origen_id = ${literal(origen.id)}::uuid`)
  await limpiarGuardado()
})

const tarjetaDelPanel = (page: Page, texto: string) =>
  panelDelVehiculo(page)
    .getByRole('list', { name: 'Vehículos' })
    .getByRole('listitem')
    .filter({ hasText: texto })
    .getByRole('button')

// Escribe en el campo del panel (ya abierto) y lo cierra con Esc.
async function escribirYCerrar(page: Page, texto: string) {
  await campoDelTitulo(page).fill(texto)
  await esperarDosCuadros(page)
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo(page)).toBeHidden()
}

test('E2E elegir un vehículo llena el título; a mano se respeta al cambiar de vehículo; vaciarlo vuelve al automático', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDeLaHoja(origen.id, lead, hilux))
  await expect(barraDelVehiculo(page)).toContainText(tituloHilux)
  await barraDelVehiculo(page).click()
  // Con vehículo nadie pide el foco: el buscador lo toma como siempre (la tarea de oro no cambia).
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toBeFocused()
  await expect(campoDelTitulo(page)).toHaveValue(tituloHilux)
  await expect(panelDelVehiculo(page)).toContainText('Automático: toma el título del vehículo.')
  await capturar(page, info, 'panel-automatico')
  await escribirYCerrar(page, 'Para Juan Pérez')
  await expect(barraDelVehiculo(page)).toContainText('Para Juan Pérez')
  await expect(barraDelVehiculo(page)).toContainText(tituloHilux)
  await capturar(page, info, 'barra-manual')

  // Otro vehículo: el manual se queda y debajo va el nuevo.
  await barraDelVehiculo(page).click()
  await panelDelVehiculo(page).getByRole('searchbox').fill(tituloCorolla)
  await tarjetaDelPanel(page, tituloCorolla).click()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${corolla}`))
  await expect(barraDelVehiculo(page)).toContainText('Para Juan Pérez')
  await expect(barraDelVehiculo(page)).toContainText(tituloCorolla)

  // Vaciarlo: con el foco puesto queda vacío; cerrado, vuelve el del vehículo.
  await barraDelVehiculo(page).click()
  await campoDelTitulo(page).fill('')
  await expect(campoDelTitulo(page)).toHaveValue('')
  await expect(campoDelTitulo(page)).toHaveAttribute('placeholder', tituloCorolla)
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo(page)).toBeHidden()
  await expect(barraDelVehiculo(page)).toContainText(tituloCorolla)
  await expect(barraDelVehiculo(page)).not.toContainText('Para Juan Pérez')
})

test('E2E sin vehículo «Guardar» pide el título y «Escribir el título» abre el panel con el foco en el campo; escrito, guarda', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  const guardados = await vigilarGuardados(page)
  await page.goto(urlDeLaHoja(origen.id, lead))
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(page.getByText('Escribe el título de la cotización.')).toBeVisible()
  await capturar(page, info, 'falta-el-titulo')
  await page.getByRole('button', { name: 'Escribir el título' }).click()
  await expect(panelDelVehiculo(page)).toBeVisible()
  await expect(campoDelTitulo(page)).toBeFocused()
  await escribirYCerrar(page, titulo)
  await expect(barraDelVehiculo(page)).toContainText(titulo)
  await expect(page.getByText('Escribe el título de la cotización.')).toBeHidden()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  guardada = guardados.pedidos[0]?.intento ?? ''
  expect(guardada).not.toBe('')
  expect(
    sql(
      `select titulo || '|' || titulo_manual::text from public.cotizaciones where id = ${literal(guardada)}::uuid`,
    ),
  ).toBe(`${titulo}|true`)
})

test('E2E el título se ve en la lista, el resumen, la cabecera, el PDF y «Copiar texto», y el listado lo busca', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await entrar(page, duena, { fresco: true })
  const numero = numeroDeLaCotizacion(guardada)
  // El buscador del listado lo encuentra por una parte del título.
  await page.goto(`/cotizaciones?q=${encodeURIComponent('para Juan Pérez')}`)
  const fila = page.locator('tbody tr, li article').filter({ hasText: `N.º ${numero}` })
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText(titulo)
  await capturar(page, info, 'listado-busqueda')
  await fila.click()
  await expect(page).toHaveURL(/cotizacion=/)
  await expect(page.getByRole('dialog').locator('[data-titulo-de-la-cotizacion]')).toHaveText(
    titulo,
  )
  await capturar(page, info, 'resumen')

  await page.goto(`/cotizaciones/${guardada}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Cotización n.º ${numero}`)
  await expect(barraDelVehiculo(page)).toContainText(titulo)
  await expect(barraDelVehiculo(page)).toContainText('Sin vehículo')
  await capturar(page, info, 'cabecera-de-la-guardada')

  const { lineas } = await leerElPdf(page, guardada)
  expect(lineas.some((l) => l.includes(`Cotización n.º ${numero} · ${titulo}`))).toBe(true)

  await abrirLaVistaPrevia(page)
  await page.evaluate(() => navigator.clipboard.writeText(''))
  await dialogo(page).getByRole('button', { name: 'Copiar texto' }).click()
  await expect(dialogo(page).getByRole('button', { name: 'Copiado' })).toBeVisible()
  const copiado = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiado.split('\n')[0]).toBe(titulo)
})

test('E2E cambiar el título en la guardada y guardar deja «Cambió el título» en «Revisiones»', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  await barraDelVehiculo(page).click()
  await expect(campoDelTitulo(page)).toHaveValue(titulo)
  // En una guardada el vehículo no se elige: ni buscador ni listas.
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toHaveCount(0)
  await capturar(page, info, 'panel-de-la-guardada')
  await escribirYCerrar(page, `${titulo} (revisado)`)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await page.getByRole('button', { name: 'Revisiones' }).click()
  await expect(page.getByRole('dialog', { name: /^Revisiones de la cotización/ })).toContainText(
    'Cambió el título',
  )
  expect(sql(`select titulo from public.cotizaciones where id = ${literal(guardada)}::uuid`)).toBe(
    `${titulo} (revisado)`,
  )
})
