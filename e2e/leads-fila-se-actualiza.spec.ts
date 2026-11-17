import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { abrirMenuDelLead, menuDelLead } from './soporte/leads-marcas'
import { modalDeRecordatorio, modalDeSeguimiento } from './soporte/leads-seguimientos'

// La fila del listado se actualiza sola al anotar un seguimiento o agendar un recordatorio desde el «⋯» (sin recargar, con filtros y cursor en su
// lugar), lee el dato en dos líneas y, sin seguimiento ni recordatorio, la celda informa y no ofrece crear: la acción vive sólo en el «⋯».
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const conElLead = (nombre: string) => `?${new URLSearchParams({ q: nombre }).toString()}`

async function elegir(page: Page, nombre: string, item: string) {
  const menu = await abrirMenuDelLead(page, nombre)
  await menu.getByRole('menuitem', { name: item }).click()
}

test('una fila sin seguimiento ni recordatorio lo dice con texto y no ofrece crear en la celda', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Fila Vacia ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  const fila = delLead(page, lead.nombre.replace(/^E2E /, ''))
  await expect(fila.getByText('Sin seguimientos')).toBeVisible()
  await expect(fila.getByRole('img', { name: 'Sin recordatorio' })).toBeVisible()
  await expect(fila.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await expect(fila.getByRole('button', { name: 'Programar' })).toHaveCount(0)
  // La única puerta es el «⋯».
  const menu = await abrirMenuDelLead(page, lead.nombre)
  await expect(menu.getByRole('menuitem', { name: 'Anotar seguimiento…' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Agendar recordatorio…' })).toBeVisible()
})

test('anotar y agendar desde el «⋯» actualizan la fila sin recargar, en dos líneas', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Fila Viva ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  const fila = delLead(page, lead.nombre.replace(/^E2E /, ''))
  await expect(fila.getByText('Sin seguimientos')).toBeVisible()
  // Una marca en la ventana: si la página se recargara, se pierde.
  await page.evaluate(() => {
    ;(window as unknown as { sinRecargar: boolean }).sinRecargar = true
  })

  await elegir(page, lead.nombre, 'Anotar seguimiento…')
  const anotar = modalDeSeguimiento(page, 'Anotar')
  await expect(anotar).toBeVisible()
  await anotar.getByLabel('Resumen').fill('Hablamos del precio')
  await anotar.getByRole('button', { name: 'Guardar' }).click()
  await expect(anotar).toHaveCount(0)
  const seguimiento = fila.locator('[data-ultimo-seguimiento]')
  await expect(seguimiento).toContainText('Hablamos del precio')
  await expect(fila.getByText('Sin seguimientos')).toHaveCount(0)
  // Dos líneas: el título arriba y «hace…» debajo.
  const titulo = await seguimiento.locator('span').first().boundingBox()
  const cuando = await seguimiento.locator('span').last().boundingBox()
  expect(titulo).not.toBeNull()
  expect(cuando).not.toBeNull()
  expect(cuando!.y).toBeGreaterThanOrEqual(titulo!.y + titulo!.height - 1)

  await elegir(page, lead.nombre, 'Agendar recordatorio…')
  const agendar = modalDeRecordatorio(page, 'Agendar')
  await expect(agendar).toBeVisible()
  await agendar.getByLabel('De qué es').fill('Llamarlo el lunes')
  await agendar.getByRole('button', { name: 'Mañana 09:00' }).click()
  await agendar.getByRole('button', { name: 'Guardar' }).click()
  await expect(agendar).toHaveCount(0)
  const recordatorio = fila.locator('[data-recordatorio-de-fila]')
  await expect(recordatorio).toContainText('Llamarlo el lunes')
  await expect(recordatorio).toContainText('en ')
  await expect(fila.getByRole('img', { name: 'Sin recordatorio' })).toHaveCount(0)

  // Sin recargar, con el filtro en la URL y el foco de vuelta en el «⋯».
  expect(
    await page.evaluate(() => (window as unknown as { sinRecargar?: boolean }).sinRecargar),
  ).toBe(true)
  await expect(page).toHaveURL(new RegExp(`q=`))
  await expect(page).not.toHaveURL(/para=/)
  await expect(menuDelLead(page, lead.nombre)).toBeFocused()
})
