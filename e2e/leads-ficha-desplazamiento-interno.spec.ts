import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  afirmarColumnasEnLaPagina,
  afirmarColumnasPorDentro,
  columnaLateral,
  columnaPrincipal,
  desplazamientoDeLaVentana,
  ESCRITORIO_BAJO,
  ESCRITORIO_GRANDE,
  medidaDe,
} from './soporte/ficha-con-desplazamiento-interno'
import { esMovil } from './soporte/inventario'
import { esperarFichaHidratada, irAFicha } from './soporte/leads-ficha'
import { leadCompleto, limpiarLeadsCompletos } from './soporte/leads-ficha-completa'
import { prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { capturar } from './soporte/recorrido'

// El desplazamiento de la ficha del lead en escritorio (T423): la ventana no se desplaza y cada columna lo hace por dentro; «ir al bloque»
// (el índice y `?seccion=`) desplaza la columna derecha; al volver a la ficha, cada columna recupera su posición. En el celular, una columna con
// el desplazamiento de la página.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const MARCA = 'E2E desp'
let completo: Awaited<ReturnType<typeof leadCompleto>>

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000)
  t = await prepararListado(`${info.project.name}-desp`)
  completo = await leadCompleto(t, MARCA, `Desplaza ${info.project.name}`, 10)
})

test.afterAll(async () => {
  await limpiarLeadsCompletos(t, MARCA)
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const titulo = (page: Page, nombre: string): Locator =>
  page.getByRole('heading', { name: nombre, exact: true, level: 2 })

test('en escritorio la ventana no se desplaza y cada columna lo hace por dentro; en el celular, la página', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  if (esMovil(page)) {
    await irAFicha(page, completo.id)
    await esperarFichaHidratada(page)
    await afirmarColumnasEnLaPagina(page)
    return
  }
  await page.setViewportSize(ESCRITORIO_GRANDE)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  await afirmarColumnasPorDentro(page)
  // La derecha trae todos los bloques: se desplaza y el índice se queda arriba de ella.
  await expect.poll(async () => (await medidaDe(columnaPrincipal(page))).sobra).toBeGreaterThan(50)
  // «Ir al bloque» desplaza la columna, no la ventana; el índice sigue a la vista y marca el bloque.
  const enlace = indice(page).getByRole('link', { name: 'Oportunidades' })
  await enlace.click()
  await expect(titulo(page, 'Oportunidades')).toBeFocused()
  await expect(enlace).toHaveAttribute('aria-current', 'location')
  await expect.poll(async () => (await medidaDe(columnaPrincipal(page))).arriba).toBeGreaterThan(0)
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  await expect(indice(page)).toBeInViewport()
  await capturar(page, info, 'columna-derecha-desplazada')
  // La izquierda tiene el suyo cuando no cabe (una ventana baja): se alcanza con el teclado y el final llega a la vista.
  await page.setViewportSize(ESCRITORIO_BAJO)
  const lateral = columnaLateral(page)
  await expect.poll(async () => (await medidaDe(lateral)).sobra).toBeGreaterThan(0)
  await expect(lateral).toHaveAttribute('tabindex', '0')
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  await lateral.evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  await expect(titulo(page, 'Acceso al portal')).toBeInViewport()
  await capturar(page, info, 'columna-izquierda-desplazada')
})

test('`?seccion=` desplaza la columna derecha y, al volver a la ficha, cada columna recupera su posición', async ({
  page,
}) => {
  test.skip(
    esMovil(page),
    'en el celular la página se desplaza y el navegador recuerda su posición',
  )
  await entrar(page, t.personas.duena)
  await page.setViewportSize(ESCRITORIO_BAJO)
  await irAFicha(page, completo.id, '?seccion=oportunidades')
  await expect(titulo(page, 'Oportunidades')).toBeFocused()
  await expect(titulo(page, 'Oportunidades')).toBeInViewport()
  expect((await medidaDe(columnaPrincipal(page))).arriba).toBeGreaterThan(0)
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  // La izquierda, a su final; la derecha, donde la dejó el salto.
  const principal = (await medidaDe(columnaPrincipal(page))).arriba
  await columnaLateral(page).evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  const lateral = (await medidaDe(columnaLateral(page))).arriba
  expect(lateral).toBeGreaterThan(0)
  // Se va a otra pantalla por un enlace de la app y se vuelve con «atrás».
  await page.getByRole('link', { name: 'Leads', exact: true }).first().click()
  await expect(page).toHaveURL(/\/leads(\?.*)?$/)
  await page.goBack()
  await expect(titulo(page, 'Oportunidades')).toBeVisible()
  await expect.poll(async () => (await medidaDe(columnaLateral(page))).arriba).toBe(lateral)
  await expect.poll(async () => (await medidaDe(columnaPrincipal(page))).arriba).toBe(principal)
})
