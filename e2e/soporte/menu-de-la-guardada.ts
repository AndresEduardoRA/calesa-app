// El «⋯» de la cabecera de una cotización guardada (`/cotizaciones/[id]`): lo que no está a la vista («Vista previa», «Descargar PDF», «Revisiones», «Marcar final…»,
// «Emitir comprobante…», «Cotizar encima», «Favorita», «Reportar…», moderar y «Enviar a la papelera»). Un clic antes de hidratar se pierde: abrir reintenta hasta ver el
// menú. Las líneas que llegan tarde (las marcas y los comprobantes, tras `<Suspense>`) se esperan con `toBeVisible`, nunca con un tiempo.
import { expect, type Locator, type Page } from '@playwright/test'

export const cabeceraDeLaGuardada = (page: Page): Locator =>
  page.locator('[data-cabecera-de-la-guardada]')

export const botonDelMenuDeLaGuardada = (page: Page): Locator =>
  cabeceraDeLaGuardada(page).getByRole('button', { name: /^Más acciones de N\.º/ })

// Abre el «⋯» (si no está abierto) y lo devuelve.
export async function abrirElMenu(page: Page): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await botonDelMenuDeLaGuardada(page).click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

export async function cerrarElMenu(page: Page): Promise<void> {
  const menu = page.getByRole('menu')
  if (await menu.isVisible()) {
    await page.keyboard.press('Escape')
  }
  await expect(menu).toBeHidden()
}

// Una línea del «⋯» (acción o casilla), sin abrirlo.
export function lineaDelMenu(page: Page, nombre: string | RegExp): Locator {
  const menu = page.getByRole('menu')
  const exacto = typeof nombre === 'string'
  return menu
    .getByRole('menuitem', { name: nombre, exact: exacto })
    .or(menu.getByRole('menuitemcheckbox', { name: nombre, exact: exacto }))
}

// Abre el «⋯» y devuelve la línea, ya a la vista.
export async function lineaAlAbrir(page: Page, nombre: string | RegExp): Promise<Locator> {
  await abrirElMenu(page)
  const linea = lineaDelMenu(page, nombre)
  await expect(linea).toBeVisible()
  return linea
}

// Abre el «⋯» y elige la línea.
export async function elegirEnElMenu(page: Page, nombre: string | RegExp): Promise<void> {
  await (await lineaAlAbrir(page, nombre)).click()
}

// Las líneas del «⋯» abierto, en orden, con «---» por cada separador (las notas de un motivo no cuentan).
export async function opcionesDelMenu(menu: Locator): Promise<string[]> {
  return menu
    .locator('[role=menuitem], [role=menuitemcheckbox], [role=separator]')
    .evaluateAll((nodos) =>
      nodos.map((nodo) =>
        nodo.getAttribute('role') === 'separator' ? '---' : nodo.textContent.trim(),
      ),
    )
}
