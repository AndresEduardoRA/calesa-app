// El ayudante de los e2e de la unidad de logística: abre la sección de un hueco sea cual sea la forma de la página. En escritorio la unidad va en zonas (pestañas); en el celular, en bloques plegables.
// No mide nada: lo puede usar un spec sin celular.
import { expect, type Locator, type Page } from '@playwright/test'

// La pestaña que contiene cada hueco (`ZONA_DEL_HUECO` de `logistica`): gastos, pagos y margen están en «Dinero».
const PESTANA_DEL_HUECO: Readonly<Record<string, string>> = {
  gastos: 'dinero',
  pagos: 'dinero',
  margen: 'dinero',
}

/**
 * Abre la sección de ese hueco: si la página tiene la pestaña, la toca; si no, abre el bloque (`<summary>`) cuando está cerrado (una sección a la vista ya lo está). Devuelve el contenido del hueco (`[data-hueco=<clave>]`).
 * Espera a que el hueco exista (con permiso y regla) antes de decidir la forma.
 */
export async function abrirSeccionDeLaUnidad(page: Page, clave: string): Promise<Locator> {
  const envoltorio = page.locator(`[data-bloque-del-hueco="${clave}"]`)
  await envoltorio.waitFor({ state: 'attached' })
  const pestana = PESTANA_DEL_HUECO[clave] ?? clave
  const tab = page.locator(
    `[data-slot="panel-de-la-unidad"] [role="tab"][data-pestana="${pestana}"]`,
  )
  if ((await tab.count()) > 0) {
    // Un clic antes de que la página hidrate se pierde (la pestaña viene del servidor): se repite hasta que quede elegida.
    await expect(async () => {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 })
    }).toPass()
  } else {
    // El panel de un ítem va con sus secciones a la vista: sin `<details>` no hay nada que abrir.
    const bloque = envoltorio.locator('details')
    if (
      (await bloque.count()) > 0 &&
      !(await bloque.evaluate((detalles: HTMLDetailsElement) => detalles.open))
    ) {
      await bloque.locator('summary').click()
    }
  }
  return page.locator(`[data-hueco="${clave}"]`)
}

/** ¿La página (la ventana) se desplaza en vertical? Falso cuando todo cabe en la pantalla. */
export const sinDesplazarLaPagina = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)
