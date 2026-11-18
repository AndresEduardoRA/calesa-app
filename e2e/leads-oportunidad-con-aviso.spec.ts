import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { capturar } from './soporte/recorrido'
import { exigir } from './soporte/leads'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDeLaFicha, abrirMenuDelLead } from './soporte/leads-marcas'
import {
  embudoPorDefecto,
  irAlEmbudo,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'

// «Nueva oportunidad…» sale del «⋯» del lead y antes avisa de las oportunidades que ya tiene (la base incluida): «Crear igual» sigue al formulario y
// «Cancelar» cierra; «Ver oportunidades» lleva a la ficha en su sección. Fila, kanban, resumen y ficha; sin oportunidades abre directo en el formulario.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const conElLead = (texto: string) => `?${new URLSearchParams({ q: texto }).toString()}`

async function deLaBase(leadId: string) {
  const { data, error } = await admin()
    .from('oportunidades')
    .select('titulo, estado')
    .eq('lead_id', leadId)
    .returns<{ titulo: string; estado: string }[]>()
  exigir(error, 'leer las oportunidades del lead')
  return data ?? []
}

// Un lead de Berta con su oportunidad base (el título es el nombre, como la que nace con todo lead).
async function leadConBase(corto: string) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await embudoPorDefecto(t.personas.berta)
  await oportunidad(t.personas.berta, lead.id, { titulo: lead.nombre })
  return lead
}

const modal = (page: Page) => page.getByRole('dialog', { name: 'Nueva oportunidad' })

async function elegir(menu: Locator, item: string) {
  await menu.getByRole('menuitem', { name: item }).click()
}

// Aviso → «Crear igual» → formulario → «Crear oportunidad».
async function crearIgual(page: Page, nombreDelLead: string, info?: TestInfo) {
  const dialogo = modal(page)
  await expect(dialogo.getByText(nombreDelLead, { exact: true }).first()).toBeVisible()
  await dialogo.getByRole('button', { name: 'Crear igual' }).click()
  await expect(dialogo.getByLabel('Título')).toHaveValue(nombreDelLead)
  if (info) {
    await capturar(page, info, 'formulario-tras-crear-igual')
  }
  await dialogo.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(page.getByText(`Oportunidad creada para «${nombreDelLead}».`)).toBeVisible()
  await expect(dialogo).toHaveCount(0)
}

test('desde el «⋯» de la fila: el aviso lista la base, «Cancelar» no crea y «Crear igual» crea', async ({
  page,
}, info) => {
  const lead = await leadConBase(`Aviso Fila ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  // Ya no hay un botón «+ Oportunidad» al costado: la puerta es el «⋯».
  await expect(page.getByRole('button', { name: /^\+ Oportunidad/ })).toHaveCount(0)

  let menu = await abrirMenuDelLead(page, lead.nombre)
  await capturar(page, info, 'menu-con-oportunidades')
  await elegir(menu, 'Nueva oportunidad…')
  await expect(page).toHaveURL(new RegExp(`panel=oportunidad-rapida&para=${lead.id}`))
  const dialogo = modal(page)
  await expect(dialogo.getByText('ya tiene oportunidades')).toBeVisible()
  const item = dialogo.getByRole('listitem').filter({ hasText: lead.nombre })
  await expect(item).toHaveCount(1)
  await expect(item.getByText('Abierta')).toBeVisible()
  await expect(item.getByRole('link', { name: /^Ver/ })).toBeVisible()
  await capturar(page, info, 'aviso-con-la-base')
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(page).not.toHaveURL(/para=/)
  expect(await deLaBase(lead.id)).toHaveLength(1)

  menu = await abrirMenuDelLead(page, lead.nombre)
  await elegir(menu, 'Nueva oportunidad…')
  await crearIgual(page, lead.nombre, info)
  expect(await deLaBase(lead.id)).toHaveLength(2)
})

test('«Ver oportunidades» lleva a la ficha en su sección, y un «Ver» del aviso, a esa oportunidad', async ({
  page,
}, info) => {
  const lead = await leadConBase(`Aviso Ver ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  let menu = await abrirMenuDelLead(page, lead.nombre)
  await elegir(menu, 'Ver oportunidades')
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=oportunidades`))
  await expect(page.getByRole('heading', { name: 'Tus oportunidades' })).toBeVisible()

  await irALeads(page, conElLead(lead.nombre))
  menu = await abrirMenuDelLead(page, lead.nombre)
  await elegir(menu, 'Nueva oportunidad…')
  await modal(page).getByRole('link', { name: /^Ver/ }).first().click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=oportunidades`))
})

test('sin oportunidades que ver, el modal abre directo en el formulario', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Aviso Sin ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  const menu = await abrirMenuDelLead(page, lead.nombre)
  await elegir(menu, 'Nueva oportunidad…')
  const dialogo = modal(page)
  await expect(dialogo.getByLabel('Título')).toHaveValue(lead.nombre)
  await expect(dialogo.getByText('ya tiene oportunidades')).toHaveCount(0)
  await dialogo.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(page.getByText(`Oportunidad creada para «${lead.nombre}».`)).toBeVisible()
  expect(await deLaBase(lead.id)).toHaveLength(1)
})

test('con más de cinco, el aviso muestra cinco y dice «y 1 más» con «Ver todas»', async ({
  page,
}, info) => {
  const lead = await leadConBase(`Aviso Seis ${info.project.name}`)
  for (let n = 2; n <= 6; n++) {
    await oportunidad(t.personas.berta, lead.id, {
      titulo: `Otra ${String(n)} ${info.project.name}`,
    })
  }
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  const menu = await abrirMenuDelLead(page, lead.nombre)
  await elegir(menu, 'Nueva oportunidad…')
  const dialogo = modal(page)
  await expect(dialogo.getByRole('listitem')).toHaveCount(5)
  await expect(dialogo.getByText('y 1 más')).toBeVisible()
  await expect(dialogo.getByRole('link', { name: 'Ver todas' })).toBeVisible()
  await capturar(page, info, 'aviso-con-mas-de-cinco')
})

test('desde el kanban: la tarjeta lee el lead al abrir el «⋯» y el aviso lista sus oportunidades', async ({
  page,
}, info) => {
  const lead = await leadConBase(`Aviso Kanban ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, lead.nombre)).toBeVisible()
  await tarjeta(page, lead.nombre)
    .getByRole('button', { name: `Más acciones de ${lead.nombre}` })
    .click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Nueva oportunidad…' })).toBeVisible()
  await elegir(menu, 'Nueva oportunidad…')
  await expect(page).toHaveURL(new RegExp(`para=${lead.id}`))
  await expect(modal(page).getByText('ya tiene oportunidades')).toBeVisible()
  await crearIgual(page, lead.nombre)
  expect(await deLaBase(lead.id)).toHaveLength(2)
})

test('desde la ficha: «Nueva oportunidad…» abre el aviso donde está', async ({ page }, info) => {
  const lead = await leadConBase(`Aviso Ficha ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  const menu = await abrirMenuDeLaFicha(page)
  await elegir(menu, 'Nueva oportunidad…')
  await expect(page).toHaveURL(/panel=oportunidad-rapida/)
  await expect(modal(page).getByText('ya tiene oportunidades')).toBeVisible()
  await crearIgual(page, lead.nombre)
  expect(await deLaBase(lead.id)).toHaveLength(2)
})

test('sin permiso o con el lead ajeno no hay «Nueva oportunidad…» ni «Ver oportunidades», y un `para=` ajeno no abre', async ({
  page,
}, info) => {
  const deBerta = await leadConBase(`Aviso Ajeno ${info.project.name}`)
  await entrar(page, t.personas.duena)
  await irALeads(page, `${conElLead(deBerta.nombre)}&alcance=todos`)
  const menu = await abrirMenuDelLead(page, deBerta.nombre)
  await expect(menu.getByRole('menuitem', { name: 'Etiquetas…' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Nueva oportunidad…' })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: 'Ver oportunidades' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await irALeads(
    page,
    `${conElLead(deBerta.nombre)}&alcance=todos&panel=oportunidad-rapida&para=${deBerta.id}`,
  )
  await expect(modal(page)).toHaveCount(0)
  expect(await deLaBase(deBerta.id)).toHaveLength(1)
  // `nombre()` sólo para que el nombre del lead siga siendo el de la convención de los e2e.
  expect(nombre('x')).toBe('E2E x')
})
