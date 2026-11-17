import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { esperarFichaHidratada, irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  dentroDeLaPantalla,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// El índice de la ficha del lead en el celular (T33): una barra pegajosa que se desplaza de costado. Con el texto al 200 % sus cuatro
// enlaces no entran: dice por qué lado sigue, el del bloque actual queda a la vista dentro de la barra (sin mover la página) y la página
// no se ensancha.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'IndiceFicha')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

const indice = (page: Page) => page.getByRole('navigation', { name: 'Índice de la ficha' })
const pista = (page: Page, lado: 'izquierda' | 'derecha') =>
  page.locator(`nav[aria-label="Índice de la ficha"] [data-desborde="${lado}"]`)

async function alDoble(page: Page) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
}

test('al 200 % en el celular el índice dice que sigue, salta al último bloque con su enlace a la vista y no ensancha la página', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'El índice se desborda sólo en el celular.')
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(tituloDeLaFicha(page, r.uno.nombre)).toBeVisible()
  await esperarFichaHidratada(page)
  await alDoble(page)
  await expect(indice(page).getByRole('link')).toHaveCount(4)
  await expect(pista(page, 'derecha')).toHaveAttribute('data-visible', 'true')
  await sinScrollHorizontal(page)
  const cotizaciones = indice(page).getByRole('link', { name: 'Cotizaciones' })
  await cotizaciones.click()
  await expect(page.getByRole('heading', { name: 'Cotizaciones', level: 2 })).toBeFocused()
  await expect(cotizaciones).toHaveAttribute('aria-current', 'location')
  // El enlace actual entra en la barra (se desplazó ella, no la página) y la pista se invierte.
  await expect(pista(page, 'izquierda')).toHaveAttribute('data-visible', 'true')
  await dentroDeLaPantalla(page, cotizaciones)
  await sinScrollHorizontal(page)
})

test('llegar con `?seccion=cotizaciones` deja su enlace marcado y a la vista dentro de la barra', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'El índice se desborda sólo en el celular.')
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id, '?seccion=cotizaciones')
  const cotizaciones = indice(page).getByRole('link', { name: 'Cotizaciones' })
  await expect(cotizaciones).toHaveAttribute('aria-current', 'location')
  await dentroDeLaPantalla(page, cotizaciones)
  // Pegajoso: a la vista aunque la página bajó hasta el bloque.
  await expect(indice(page)).toBeInViewport()
})
