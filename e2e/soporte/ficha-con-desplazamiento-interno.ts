import { expect, type Locator, type Page } from '@playwright/test'

// Lo común a los e2e de las dos fichas en dos columnas sobre su desplazamiento (`ficha-en-bloques`): en escritorio la página no se
// desplaza y cada columna lo hace por dentro; en el celular una columna con el desplazamiento de la página.

export const ESCRITORIO_GRANDE = { width: 1440, height: 900 } as const
export const ESCRITORIO_BAJO = { width: 1440, height: 600 } as const

const columna = (page: Page, cual: 'lateral' | 'principal'): Locator =>
  page.locator(`[data-ficha-en-bloques] [data-columna-de-ficha="${cual}"]`).locator('visible=true')

export const columnaLateral = (page: Page): Locator => columna(page, 'lateral')
export const columnaPrincipal = (page: Page): Locator => columna(page, 'principal')

// Cuánto se puede desplazar la ventana (nada, si la página no se desplaza) y cómo está cada columna.
export const desplazamientoDeLaVentana = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

// Que los bloques que leen al acercarse ya hayan llegado: un esqueleto más alto que lo que lo reemplaza achica la columna al llegar y mueve su posición, así
// que una posición medida antes no es la que queda.
export const bloquesLlegaron = (page: Page): Promise<void> =>
  expect(page.locator('[data-ficha-en-bloques] [aria-busy="true"]')).toHaveCount(0)

export const medidaDe = (lugar: Locator) =>
  lugar.evaluate((e) => ({
    overflowY: getComputedStyle(e).overflowY,
    sobra: e.scrollHeight - e.clientHeight,
    arriba: e.scrollTop,
  }))

// En escritorio: la ventana quieta (sin desplazamiento vertical) y las dos columnas con su propio desplazamiento.
export async function afirmarColumnasPorDentro(page: Page): Promise<void> {
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  expect((await medidaDe(columnaPrincipal(page))).overflowY).toBe('auto')
  expect((await medidaDe(columnaLateral(page))).overflowY).toBe('auto')
}

// En el celular: nada se desplaza por dentro; lo lleva la página.
export async function afirmarColumnasEnLaPagina(page: Page): Promise<void> {
  expect((await medidaDe(columnaPrincipal(page))).overflowY).toBe('visible')
  expect((await medidaDe(columnaLateral(page))).overflowY).toBe('visible')
  expect(await desplazamientoDeLaVentana(page)).toBeGreaterThan(0)
}
