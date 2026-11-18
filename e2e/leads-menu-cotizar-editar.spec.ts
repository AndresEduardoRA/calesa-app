import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { borrarLeadsDePrueba } from './soporte/leads'
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
import { capturar, crearAsesoraDeLaSemilla } from './soporte/recorrido'

// Las dos acciones que T341 suma al «⋯» del lead (`entities/acciones-de-lead.ts`): «Cotizar lead», la acción principal (destacada, sola
// arriba y la primera con el teclado), que abre la hoja con el lead elegido y vuelve con `returnTo`; y «Editar lead» (o «Editar teléfonos»
// con sólo los teléfonos extra), que abre el panel de edición también desde la lista (`?panel=editar-lead&para=<id>`). El orden completo en
// cada superficie lo mira `leads-menu-orden.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/t341`.
test.describe.configure({ mode: 'serial' })

// La asesora de la semilla: cotiza en todos los orígenes, edita su cartera y envía lo suyo; no ve la actividad.
const CON_COTIZAR = [
  'Cotizar lead',
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
  await borrarLeadsDePrueba()
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

test('«Cotizar lead» va primero y destacado en la fila, la ficha y el kanban; desde la fila abre la hoja con el lead y «Volver» regresa', async ({
  page,
}, info) => {
  test.setTimeout(90_000)
  const { email: asesora } = await crearAsesoraDeLaSemilla(`menu-orden-${info.project.name}`)
  const corto = `Cotizar menu ${info.project.name}`
  const lead = await nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: asesora })
  const titulo = `Op cotizar ${info.project.name}`
  await embudoPorDefecto(asesora)
  await oportunidad(asesora, lead.id, { titulo })
  await entrar(page, asesora, { fresco: true })

  // La fila: con el teclado, el primer ítem enfocado es «Cotizar lead», en negrita.
  await irALeads(page, '?por=25')
  const boton = page.getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
  await boton.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  expect(await opciones(menu)).toEqual(CON_COTIZAR)
  const cotizar = menu.getByRole('menuitem', { name: 'Cotizar lead' })
  await expect(cotizar).toBeFocused()
  await expect(cotizar).toHaveAttribute('data-principal', '')
  await expect(menu.locator('[data-principal]')).toHaveCount(1)
  await expect(separadores(menu)).toHaveCount(4)
  await capturar(page, info, 'menu-del-lead-cotizar-fila')

  // Elegirla abre la hoja con este lead elegido, y «Volver» regresa a la lista con su consulta.
  await cotizar.click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('lead')).toBe(lead.id)
  expect(url.searchParams.get('returnTo')).toBe('/leads?por=25')
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Cliente:/ })).toContainText(corto)
  await page.getByRole('link', { name: 'Volver' }).click()
  await expect(page).toHaveURL(/\/leads\?por=25$/)

  // La ficha: el mismo orden, «Cotizar lead» primero; vuelve a la ficha.
  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(CON_COTIZAR)
  await expect(deLaFicha.getByRole('menuitem', { name: 'Cotizar lead' })).toHaveAttribute(
    'data-principal',
    '',
  )
  await deLaFicha.getByRole('menuitem', { name: 'Cotizar lead' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(`/leads/${lead.id}`)

  // El kanban: el mismo orden.
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  const delKanban = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(delKanban)).toEqual(CON_COTIZAR)
  await expect(delKanban.getByRole('menuitem', { name: 'Cotizar lead' })).toHaveAttribute(
    'data-principal',
    '',
  )
  await cerrar(page, delKanban)
})

test('«Editar lead» desde la fila abre el panel de edición del lead sin salir de la lista', async ({
  page,
}, info) => {
  const corto = `Editar fila ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const menu = await abrirMenuDelLead(page, nombre(corto))
  await menu.getByRole('menuitem', { name: 'Editar lead' }).click()
  await expect(page).toHaveURL(new RegExp(`panel=editar-lead&para=${lead.id}`))
  const panel = page.getByRole('dialog', { name: `Editar ${nombre(corto)}` })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Guardar' })).toBeVisible()
  await capturar(page, info, 'menu-del-lead-editar-fila')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).toHaveURL(/\/leads$/)
})

test('con sólo los teléfonos extra, el «⋯» dice «Editar teléfonos» y abre el panel en modo teléfonos', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  const correo = correoDePrueba(`solo-telefonos-menu-${proyecto}`)
  await crearPersona({
    email: correo,
    contrasena: CONTRASENA,
    nombre: 'Tere Teléfonos',
    invitada: true,
  })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Solo teléfonos menú ${proyecto}`,
      clave: `e2e_solo_tel_menu_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.telefonos_extra.editar', alcance: 'propios' },
    ],
  })
  const corto = `Solo tel ${proyecto}`
  const lead = await nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: correo })
  await entrar(page, correo, { fresco: true })
  await irALeads(page)
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual([
    'Ver oportunidades',
    'Editar teléfonos',
    ...SOLO_MARCAS,
  ])
  await deLaFila.getByRole('menuitem', { name: 'Editar teléfonos' }).click()
  const panel = page.getByRole('dialog', { name: `Teléfonos de ${nombre(corto)}` })
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  await expect(deLaFicha.getByRole('menuitem', { name: 'Editar teléfonos' })).toBeVisible()
  await cerrar(page, deLaFicha)
})
