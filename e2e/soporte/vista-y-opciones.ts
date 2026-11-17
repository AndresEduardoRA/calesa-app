// «Vista y opciones» (`src/shared/ui/vista-y-opciones`): el botón de la barra de un listado que agrupa vista, alcance, ítems por página,
// vistas guardadas, exportar y papelera. El botón se busca en `main` y a la vista (Next conserva la pantalla anterior escondida); el panel
// va en un portal, fuera de `main`: se busca en la página por su rol y su nombre.
import { expect, type Locator, type Page } from '@playwright/test'
import { aLaVista } from './inventario'

export const botonDeVistaYOpciones = (page: Page): Locator =>
  aLaVista(page.locator('main').getByRole('button', { name: /^Vista y opciones/ }))

export const panelDeVistaYOpciones = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Vista y opciones' })

// Una sección del panel por su título («Vista», «Qué leads ver», «Ítems por página», «Vistas guardadas», «Más»…).
export const seccionDeVistaYOpciones = (page: Page, titulo: string): Locator =>
  panelDeVistaYOpciones(page).getByRole('region', { name: titulo, exact: true })

// La página llega pintada por el servidor antes de que React enganche el botón: un clic en ese instante se pierde. El botón lleva
// `data-hidratado`, que React pone recién cuando lo enganchó.
// Se busca por su marca y no por su rol: con un panel modal abierto encima (el resumen de una fila) el botón sale del árbol de accesibilidad.
export async function esperarBotonHidratado(page: Page, tope = 5_000): Promise<void> {
  await expect(aLaVista(page.locator('main [data-vista-y-opciones]')).first()).toHaveAttribute(
    'data-hidratado',
    'true',
    { timeout: tope },
  )
}

// Abre el panel y espera a que esté (la primera vez llega su código). Si ya está abierto, no hace nada: un clic de más lo cerraría.
export async function abrirVistaYOpciones(page: Page): Promise<Locator> {
  const boton = botonDeVistaYOpciones(page)
  const panel = panelDeVistaYOpciones(page)
  await esperarBotonHidratado(page)
  if ((await boton.getAttribute('aria-expanded')) !== 'true') {
    await expect(async () => {
      if ((await boton.getAttribute('aria-expanded')) !== 'true') {
        await boton.click()
      }
      await expect(boton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 })
    }).toPass({ timeout: 10_000 })
  }
  await expect(panel).toBeVisible({ timeout: 10_000 })
  return panel
}

// Cierra con Esc y comprueba que el foco volvió al botón.
export async function cerrarVistaYOpciones(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(panelDeVistaYOpciones(page)).toBeHidden()
  await expect(botonDeVistaYOpciones(page)).toBeFocused()
}

// Abre el panel y pulsa una opción por su nombre exacto («Etapas…», «Nuevo embudo…», «Exportar…», «Papelera», «Embudo»…): un botón o un enlace.
export async function elegirEnVistaYOpciones(page: Page, nombre: string): Promise<void> {
  const panel = await abrirVistaYOpciones(page)
  const opcion = panel
    .getByRole('button', { name: nombre, exact: true })
    .or(panel.getByRole('link', { name: nombre, exact: true }))
  await opcion.click()
}

// Afirma que «Vista y opciones» no ofrece una opción (un botón o un enlace por su nombre exacto) con el panel abierto y llegado (se ve
// `seccion`, que sí está): cerrado, la ausencia pasaría siempre. Después lo cierra.
export async function exigirQueNoOfrece(
  page: Page,
  nombre: string,
  seccion: string,
): Promise<void> {
  const panel = await abrirVistaYOpciones(page)
  await expect(panel.getByRole('region', { name: seccion, exact: true })).toBeVisible()
  await expect(
    panel
      .getByRole('button', { name: nombre, exact: true })
      .or(panel.getByRole('link', { name: nombre, exact: true })),
  ).toHaveCount(0)
  await cerrarVistaYOpciones(page)
}
