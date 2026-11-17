import { expect, test } from './soporte/prueba'
import { aLaVista, editarDesdeLaLista, entrar } from './soporte/inventario'
import { crearLead, marcarInteres } from './soporte/leads'
import { nadaSeSaleDelPanel } from './soporte/panel'
import { esDelMarco } from './soporte/pedidos-del-marco'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import {
  OTRO,
  TITULO,
  abrirConUnClic,
  alInventario,
  filaDe,
  limpiarResumen,
  prepararResumen,
  resumenDe,
  sembrarFotos,
  type TerrenoDelResumen,
} from './soporte/vehiculos-resumen'

// El resumen de un vehículo (`?vehiculo=`, 9i): un clic en cualquier parte de la fila o la tarjeta lo abre; arriba la portada, lo que
// lo identifica y su estado, con «Editar» y «Abrir ficha»; «Resumen» (con el bloque «Relacionados» arriba de las pestañas) y «Fotos», y lo que cuesta. Editarlo, y los casos
// que no son el feliz, en `vehiculos-resumen-casos.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelResumen

test.beforeAll(async ({}, info) => {
  t = await prepararResumen(info.project.name)
})

test.afterAll(async () => {
  await limpiarResumen(t.id)
})

test('un clic en cualquier parte de la fila o la tarjeta abre el resumen, con lo que identifica al vehículo', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  await expect(page).toHaveURL(new RegExp(`vehiculo=${t.id}`))
  // La fila queda marcada como la abierta.
  await expect(filaDe(page, TITULO)).toHaveAttribute('data-state', 'selected')
  // Arriba: lo que lo identifica (el número, lo «en tarjeta» del layout), su estado y lo que se puede hacer.
  await expect(resumen.getByText('Corea · #')).toBeAttached()
  // Lo «en tarjeta» está arriba; el resto de los datos está en la ficha.
  await expect(resumen.getByText('Puertas').first()).toBeVisible()
  await expect(resumen.getByText('Sin fase')).toBeVisible()
  await expect(resumen.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute(
    'href',
    `/vehiculos/${t.id}`,
  )
  // La versión corta de la ficha: sin pestañas.
  await expect(resumen.getByRole('tablist')).toHaveCount(0)
  await capturar(page, info, 'resumen-de-vehiculo')
  // Recargar lo reabre; cerrar lo cierra.
  await page.reload()
  await expect(resumenDe(page, TITULO)).toBeVisible()
  await resumenDe(page, TITULO).getByRole('button', { name: 'Cerrar' }).click()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(resumenDe(page, TITULO)).toHaveCount(0)
})

test('con el teclado se alcanza el nombre, Enter abre el resumen y al cerrarlo el foco vuelve', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const nombre = aLaVista(page.getByRole('button', { name: `Abrir ${OTRO}`, exact: true }))
  await nombre.focus()
  await page.keyboard.press('Enter')
  await expect(resumenDe(page, OTRO)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(resumenDe(page, OTRO)).toHaveCount(0)
  await expect(nombre).toBeFocused()
})

test('«Editar» del «⋯» de la fila abre el panel de edición, no el resumen', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await editarDesdeLaLista(page, TITULO)
  const panel = page.getByRole('dialog', { name: `Editar ${TITULO}` })
  await expect(panel).toBeVisible()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await panel.getByRole('button', { name: 'Cancelar' }).click()
})

test('«Relacionados» llega en chips y un `?pestana=fotos` viejo abre el visor del carrusel del resumen', async ({
  page,
}, info) => {
  await sembrarFotos(t.id, 3)
  const marta = await crearLead({
    nombre: 'Marta Resumen',
    telefono: `591788${String(Math.floor(Math.random() * 90000) + 10000)}`,
    deQuien: t.lector,
  })
  await marcarInteres({ vehiculoId: t.id, leadId: marta, quien: t.lector, nota: 'Pidió el precio' })

  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/') && !esDelMarco(pedido.url())) {
      pedidos.push(pedido.url())
    }
  })
  const resumen = await abrirConUnClic(page, TITULO)
  // Los relacionados están a la vista, sin elegir nada: una lectura (`vehiculo_relacionados`).
  // En una línea de chips: el grupo, con sus filas, en el popover del chip.
  const relacionados = resumen.getByRole('region', { name: 'Relacionados' })
  await expect(relacionados.getByRole('button', { name: /^Interesado · 1/ })).toBeVisible()
  expect(pedidos.filter((url) => url.includes('vehiculo_relacionados'))).toHaveLength(1)
  await relacionados.getByRole('button', { name: /^Interesado · 1/ }).click()
  const popover = page.getByRole('dialog', { name: 'Relacionados: Interesado' })
  await expect(popover.getByText('E2E Marta Resumen')).toBeVisible()
  await expect(popover.getByText('Pidió el precio')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  await capturar(page, info, 'resumen-relacionados')

  // Un enlace viejo con `?pestana=fotos` abre el visor del carrusel del resumen (su clave, aparte de la de la fila), sin sumar al historial.
  await alInventario(page, t.terreno.corea.id, `&vehiculo=${t.id}&pestana=fotos`)
  const visor = page.locator('[data-visor-de-imagenes]')
  await expect(visor).toBeVisible()
  await expect(visor).toHaveCount(1)
  await expect(page).toHaveURL(new RegExp(`visor=${t.id}-resumen`))
  await expect(page).not.toHaveURL(/pestana=/)
  await expect(visor.getByText('1 de 3')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(visor.getByText('2 de 3')).toBeVisible()
  await expect(page).toHaveURL(/foto=2/)
  await capturar(page, info, 'visor-de-fotos')
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await expect(resumenDe(page, TITULO)).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('quien no ve leads no tiene «Relacionados», y una pestaña vieja se quita de la URL', async ({
  page,
}) => {
  await entrar(page, t.lectorSinLeads)
  await alInventario(page, t.terreno.corea.id, `&vehiculo=${t.id}&pestana=interesados`)
  const resumen = resumenDe(page, TITULO)
  await expect(resumen).toBeVisible()
  await expect(page).not.toHaveURL(/pestana=/)
  await expect(resumen.getByRole('tablist')).toHaveCount(0)
  await expect(resumen.getByRole('region', { name: 'Relacionados' })).toHaveCount(0)
})

test('abrir el resumen cuesta un pedido a la base y nada antes de abrirlo', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rest/v1/') && !esDelMarco(pedido.url())) {
      pedidos.push(pedido.url())
    }
  })
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO)).toBeVisible()
  expect(pedidos).toHaveLength(0)
  await abrirConUnClic(page, TITULO)
  await expect.poll(() => pedidos.length).toBeGreaterThan(0)
  await page.waitForLoadState('networkidle')
  // El vehículo, sus fotos al acercarse y sus relacionados (una RPC): tres pedidos.
  expect(pedidos.length).toBeLessThanOrEqual(3)
  expect(pedidos[0]).toContain('/rest/v1/vehiculos')
})

test('con el texto al 200 % el resumen no ensancha la página', async ({ page }, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const resumen = await abrirConUnClic(page, TITULO)
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toBeVisible()
  await sinScrollHorizontal(page)
  await nadaSeSaleDelPanel(resumen)
  await capturar(page, info, 'resumen-200')
  await page.emulateMedia({ colorScheme: 'dark' })
  await capturar(page, info, 'resumen-200-oscuro')
})
