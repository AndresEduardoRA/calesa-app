// Lo que comparten los e2e de los teléfonos de la ficha: un lead de Berta con el código de país
// guardado (como lo deja el alta) y su ficha abierta, y los números que no se repiten.
import { expect, type Page } from '@playwright/test'
import { entrar } from './alta'
import {
  fijarCodigoDePais,
  irAFicha,
  nuevoLead,
  tituloDeLaFicha,
  type LeadDePrueba,
} from './leads-ficha'
import { telefonoAlAzar } from './leads-alta'
import type { TerrenoDelListado } from './leads-listado'

// Un número nacional que no se repite: la base lo guarda con el código de la empresa.
export const nacional = () => telefonoAlAzar()
export const completoCon = (t: TerrenoDelListado, nac: string) => `${t.codigo}${nac}`

export async function fichaDeBerta(
  t: TerrenoDelListado,
  page: Page,
  corto: string,
): Promise<LeadDePrueba & { nac: string }> {
  const nac = nacional()
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nac),
    deQuien: t.personas.berta,
  })
  await fijarCodigoDePais(lead.id, t.codigo)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return { ...lead, nac }
}

// «Agregar teléfono» es un modal con su URL dentro del panel de edición (`?panel=editar-lead&extra=nuevo`): la ficha muestra los teléfonos
// sólo para leer.
export const modalDeExtra = (page: Page) => page.getByRole('dialog', { name: 'Agregar teléfono' })

// El panel que administra los teléfonos: la edición («Editar …») o, sin `leads.editar`, el modo teléfonos («Teléfonos de …»).
export const panelConTelefonos = (page: Page) =>
  page.getByRole('dialog', { name: /^(Editar|Teléfonos de) / })

export const botonAgregarTelefono = (page: Page) =>
  panelConTelefonos(page).getByRole('button', { name: 'Agregar teléfono' })

// Abre el panel con «Editar» de la cabecera o, sin él, con «Editar teléfonos» (la página hidrata antes de que el clic valga).
export async function abrirPanelConTelefonos(page: Page) {
  const panel = panelConTelefonos(page)
  if (await panel.isVisible()) {
    return panel
  }
  await expect(async () => {
    const editar = page.locator('main header').getByRole('button', { name: 'Editar', exact: true })
    await (
      (await editar.isVisible()) ? editar : page.getByRole('button', { name: 'Editar teléfonos' })
    ).click()
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass()
  return panel
}

export async function abrirAgregarTelefono(page: Page) {
  await abrirPanelConTelefonos(page)
  await botonAgregarTelefono(page).click()
  await expect(modalDeExtra(page).getByLabel('Teléfono extra')).toBeFocused()
  return modalDeExtra(page)
}

// En el celular el modal entra entero en la pantalla (va arriba y su cuerpo se desplaza).
export async function cabeEnLaPantalla(page: Page, dialogo: ReturnType<Page['getByRole']>) {
  const caja = await dialogo.boundingBox()
  const pantalla = page.viewportSize()
  expect(caja).not.toBeNull()
  expect(pantalla).not.toBeNull()
  if (caja && pantalla) {
    expect(caja.y).toBeGreaterThanOrEqual(0)
    expect(caja.x).toBeGreaterThanOrEqual(0)
    expect(caja.y + caja.height).toBeLessThanOrEqual(pantalla.height + 1)
    expect(caja.x + caja.width).toBeLessThanOrEqual(pantalla.width + 1)
  }
}
