import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarLeadsDePrueba } from './soporte/leads'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha } from './soporte/leads-ficha'
import {
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDeLaFicha, abrirMenuDelLead, menuDeLaFicha } from './soporte/leads-marcas'
import {
  embudoPorDefecto,
  irAlEmbudo,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'
import { borrarLotesDePrueba } from './soporte/papelera'
import { capturar } from './soporte/recorrido'

// El «⋯» del lead, el mismo en la fila del listado (la tarjeta de la lista en el celular), la tarjeta del kanban y la ficha (9i, T341): una
// sola lista en este orden —«Cotizar lead» destacado y solo arriba; agendar, anotar, nueva oportunidad y ver oportunidades; «Editar lead»
// (o «Editar teléfonos») en su bloque; «Ver actividad»; etiquetas, favorito y tachado y, separada, la papelera—, y lo que una persona no puede
// hacer no aparece. Cada acción hace lo suyo en cada superficie. Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

// Berta (asesora del terreno): edita su cartera y envía lo suyo; no cotiza ni ve la actividad.
const COMPLETO = [
  'Agendar recordatorio…',
  'Anotar seguimiento…',
  'Nueva oportunidad…',
  'Ver oportunidades',
  'Editar lead',
  'Etiquetas…',
  'Favorito',
  'Tachado',
  'Enviar a la papelera',
]
const SOLO_MARCAS = ['Etiquetas…', 'Favorito', 'Tachado']

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  // Enviar a la papelera deja un lote de quien lo envió: se va, con sus leads, antes que las personas.
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarListado(t)
})

const leadDeBerta = (corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })

async function opciones(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem], [role=menuitemcheckbox]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

const separadores = (menu: Locator) => menu.getByRole('separator')

async function cerrar(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

// El «⋯» de la tarjeta del kanban: lee el lead al abrirse, así que se espera la lista entera.
async function menuDeLaTarjeta(page: Page, titulo: string, corto: string): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await tarjeta(page, titulo)
        .getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
        .click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

test('con todo, el orden es el mismo en la fila, la tarjeta del kanban y la ficha', async ({
  page,
}, info) => {
  const corto = `Orden ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op orden ${info.project.name}`
  await embudoPorDefecto(t.personas.berta)
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)

  // La fila (o la tarjeta del celular) del listado.
  await irALeads(page)
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual(COMPLETO)
  // Cuatro bloques: lo que se hace con el lead, «Editar lead», las marcas y la papelera (tres separadores).
  await expect(separadores(deLaFila)).toHaveCount(3)
  await capturar(page, info, 'menu-del-lead-fila')
  await cerrar(page, deLaFila)

  // La ficha.
  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(COMPLETO)
  await expect(separadores(deLaFicha)).toHaveCount(3)
  await capturar(page, info, 'menu-del-lead-ficha')
  await cerrar(page, deLaFicha)

  // La tarjeta del kanban: trae sus datos al abrirse.
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  const delKanban = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(delKanban)).toEqual(COMPLETO)
  await expect(separadores(delKanban)).toHaveCount(3)
  await capturar(page, info, 'menu-del-lead-kanban')
  await cerrar(page, delKanban)
})

test('quien ve el lead sin tenerlo en su cartera ni poder enviarlo sólo ve las marcas, en la fila y en la ficha', async ({
  page,
}, info) => {
  const corto = `Ajeno orden ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.sinCrear)
  await irALeads(page, '?alcance=todos')
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual(SOLO_MARCAS)
  // Un solo bloque: sin separadores.
  await expect(separadores(deLaFila)).toHaveCount(0)
  await cerrar(page, deLaFila)

  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(SOLO_MARCAS)
  await cerrar(page, deLaFicha)
})

test('anotar y agendar abren su modal donde se pidieron: la ficha y el kanban', async ({
  page,
}, info) => {
  const corto = `Acciones ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op acciones ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)

  // La ficha abre el modal (el bloque «Seguimiento» ya está a la vista, sin navegar), sin `para`.
  await irAFicha(page, lead.id)
  let menu = await abrirMenuDeLaFicha(page)
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  await expect(page).toHaveURL(/panel=anotar-seguimiento/)
  await expect(page).not.toHaveURL(/para=/)
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeHidden()
  menu = await abrirMenuDeLaFicha(page)
  await menu.getByRole('menuitem', { name: 'Agendar recordatorio…' }).click()
  await expect(page).toHaveURL(/panel=agendar-recordatorio/)
  await expect(page.getByRole('dialog', { name: 'Agendar recordatorio' })).toBeVisible()
  await page.keyboard.press('Escape')

  // La tarjeta del kanban abre el modal de la fila, sobre ese lead.
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  menu = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(menu)).toEqual(COMPLETO)
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  const modal = page.getByRole('dialog', { name: 'Anotar seguimiento' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`para=${lead.id}`))
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('anotar desde el «⋯» de la ficha: «atrás» devuelve el foco al «⋯», con y sin recargar (4-61)', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Foco ficha ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  const anotar = page.getByRole('dialog', { name: 'Anotar seguimiento' })
  const abrirAnotar = async () => {
    const menu = await abrirMenuDeLaFicha(page)
    await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
    await expect(page).toHaveURL(/panel=anotar-seguimiento/)
    await expect(anotar).toBeVisible()
  }
  // Sin recargar, Base UI lo devuelve al «⋯».
  await abrirAnotar()
  await page.goBack()
  await expect(anotar).toBeHidden()
  await expect(menuDeLaFicha(page)).toBeFocused()
  // Tras recargar con el modal abierto, lo devuelve la marca de `vuelta-del-foco`.
  await abrirAnotar()
  await page.reload()
  await expect(anotar).toBeVisible()
  await page.goBack()
  await expect(anotar).toBeHidden()
  await expect(menuDeLaFicha(page)).toBeFocused()
})

test('favorito desde el «⋯» de la fila queda marcado, y enviar a la papelera lo avisa sin salir de la lista', async ({
  page,
}, info) => {
  const corto = `Marcas fila ${info.project.name}`
  await leadDeBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  let menu = await abrirMenuDelLead(page, nombre(corto))
  await menu.getByRole('menuitemcheckbox', { name: 'Favorito' }).click()
  await cerrar(page, menu)
  menu = await abrirMenuDelLead(page, nombre(corto))
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Favorito' })).toBeChecked()

  await menu.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page).toHaveURL(/\/leads$/)
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: `«${nombre(corto)}» se envió a la papelera.` }),
  ).toBeVisible()
})

test('sin red al abrir el «⋯» de una tarjeta del kanban lo dice, y al volver la red muestra la lista', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60_000)
  const corto = `Sin red ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op sin red ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  await context.setOffline(true)
  await tarjeta(page, titulo)
    .getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
    .click()
  // La lectura reintenta antes de rendirse (supabase-js: unos 7 s sin red).
  await expect(page.getByText('No se pudo cargar. Cierra el menú y vuelve a abrirlo.')).toBeVisible(
    { timeout: 20_000 },
  )
  await context.setOffline(false)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  const menu = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(menu)).toEqual(COMPLETO)
})

test('la dueña sobre un lead ajeno: marca y envía, pero no anota ni agenda (no es de su cartera)', async ({
  page,
}, info) => {
  const corto = `Ajeno dueña ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  // Cotiza y tiene `actividad.ver`: «Cotizar lead» y «Ver actividad» en la fila y en la ficha; sin la cartera, ni editar ni seguimiento.
  const AJENO = [
    'Cotizar lead',
    'Ver actividad',
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ]
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual(AJENO)
  await expect(separadores(deLaFila)).toHaveCount(3)
  await capturar(page, info, 'menu-del-lead-duena-fila')
  // «Ver actividad» lleva a la actividad de este lead.
  await deLaFila.getByRole('menuitem', { name: 'Ver actividad' }).click()
  await expect(page).toHaveURL(new RegExp(`/actividad\\?.*registro=${lead.id}`))
  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(AJENO)
  await cerrar(page, deLaFicha)
})
