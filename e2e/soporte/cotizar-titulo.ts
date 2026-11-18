// El título de la cotización en la hoja (T307): se escribe en el campo «Título de la cotización», arriba del panel del vehículo, que abre la barra del vehículo. Sin
// vehículo es obligatorio: los specs que guardan sin vehículo lo escriben antes de guardar.
import { expect, type Locator, type Page } from '@playwright/test'
import { esperarDosCuadros } from './barra-de-filtros'

export const TITULO_DE_PRUEBA = 'Cotización de prueba sin vehículo'

export const barraDelVehiculo = (page: Page): Locator => page.locator('[data-barra-del-vehiculo]')
export const campoDelTitulo = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Título de la cotización' })
export const panelDelVehiculo = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Vehículo' })

// Abre el panel desde la barra, escribe el título y lo cierra con Esc (la hoja queda como estaba).
export async function escribirElTitulo(
  page: Page,
  texto: string = TITULO_DE_PRUEBA,
): Promise<void> {
  await barraDelVehiculo(page).click()
  const campo = campoDelTitulo(page)
  await expect(campo).toBeVisible()
  await campo.fill(texto)
  await esperarDosCuadros(page)
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo(page)).toBeHidden()
  await expect(barraDelVehiculo(page)).toContainText(texto.trim())
}
