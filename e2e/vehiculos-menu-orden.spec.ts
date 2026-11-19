import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar, menuDeVehiculo } from './soporte/inventario'
import { crearLead, vincular } from './soporte/leads'
import { capturar } from './soporte/recorrido'
import { vehiculoPorTitulo } from './soporte/vehiculos'
import {
  OTRO,
  TITULO,
  alInventario,
  enlaceDe,
  limpiarLista,
  prepararLista,
  type TerrenoDeLaLista,
} from './soporte/vehiculos-lista'

// El «⋯» de un vehículo, el mismo en la fila, la tarjeta y la ficha (9i, T336): «Cotizar vehículo» sola arriba; «Editar», «Editar imágenes» y
// «Publicar en la web…»; «Ver actividad»; y, separada, «Enviar a la papelera». En la ficha no hay «Editar» suelto: va en el «⋯»; lo que una persona no puede
// hacer no aparece (y la papelera, si ya se sabe que no va, se ve apagada con el motivo). Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaLista

test.beforeAll(async ({}, info) => {
  // Con las dos claves de cotizar, la fila ofrece «Cotizar vehículo» (T335) sea la dueña de prueba la primera del equipo o una invitada.
  t = await prepararLista(`${info.project.name}_menu`, [
    'vehiculos.vitrina',
    'vehiculos.eliminar',
    'cotizaciones.crear',
    'cotizaciones.ver',
  ])
})

test.afterAll(async () => {
  await limpiarLista(t.id)
})

async function opciones(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem], [role=menuitemcheckbox]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

// Abre el «⋯» que está a la vista (la fila, la tarjeta o la ficha) y lo espera.
async function abrir(boton: Locator, page: Page): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await boton.click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

async function cerrar(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

test('con todo, el orden es el mismo en la fila y la ficha, y la papelera va separada al final', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const deLaFila = await abrir(menuDeVehiculo(page, TITULO), page)
  // La dueña tiene `actividad.ver`: «Ver actividad» también en la fila.
  const TODAS = [
    'Cotizar vehículo',
    'Editar',
    'Editar imágenes',
    'Publicar en la web…',
    'Ver actividad',
    'Enviar a la papelera',
  ]
  expect(await opciones(deLaFila)).toEqual(TODAS)
  await expect(deLaFila.getByRole('separator')).toHaveCount(3)
  await capturar(page, info, 'menu-del-vehiculo-fila')
  await cerrar(page, deLaFila)

  await page.goto(`/vehiculos/${t.id}`)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  const deLaFicha = await abrir(
    page.getByRole('button', { name: `Más acciones de ${TITULO}` }),
    page,
  )
  expect(await opciones(deLaFicha)).toEqual(TODAS)
  await capturar(page, info, 'menu-del-vehiculo-ficha')
  await cerrar(page, deLaFicha)
})

test('lo que no se puede no aparece: con sólo «editar» el «⋯» tiene «Editar» y «Editar imágenes»', async ({
  page,
}) => {
  await entrar(page, t.terreno.soloCorea)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  expect(await opciones(menu)).toEqual(['Editar', 'Editar imágenes'])
  await expect(menu.getByRole('separator')).toHaveCount(0)
})

test('sin nada que ofrecer no hay «⋯»', async ({ page }) => {
  await entrar(page, t.lectorSinLeads)
  await alInventario(page, t.terreno.corea.id)
  await expect(enlaceDe(page, TITULO)).toBeAttached()
  await expect(menuDeVehiculo(page, TITULO)).toHaveCount(0)
})

test('«Publicar en la web…» abre el panel de la vitrina sin salir de la lista', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Publicar en la web…' }).click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos\\?.*panel=vitrina&para=${t.id}`))
  await expect(page.getByRole('dialog', { name: 'Publicar en la web' })).toBeVisible()
})

test('un vehículo vinculado a un lead tiene la papelera apagada, con el motivo', async ({
  page,
}) => {
  const lead = await crearLead({
    nombre: 'Lead menu vehiculo',
    telefono: `591789${String(Math.floor(Math.random() * 90000) + 10000)}`,
    deQuien: t.terreno.duena,
  })
  const otro = (await vehiculoPorTitulo(OTRO))?.id ?? ''
  await vincular(otro, lead)
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, OTRO), page)
  await expect(menu.getByRole('menuitem', { name: 'Enviar a la papelera' })).toBeDisabled()
  await expect(menu.getByText('Está vinculado a un lead. Quita el vínculo antes.')).toBeVisible()
  // El aviso trae su salida: la que destraba primero y, como la dueña tiene el lead, «Ver el lead».
  expect(await opciones(menu)).toEqual(
    expect.arrayContaining(['Quitar el vínculo', 'Ver el lead', 'Enviar a la papelera']),
  )
  await menu.getByRole('menuitem', { name: 'Quitar el vínculo' }).click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${otro}\\?.*panel=desvincular`))
  await expect(page).toHaveURL(/luego=papelera/)
  const dialogo = page.getByRole('dialog', { name: /^Desvincular «/ })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('button', { name: 'Desvincular' }).click()
  // Desvinculado, el aviso ofrece lo que se quería hacer: enviarlo a la papelera.
  const ofrecido = page.locator('[data-sonner-toast]').getByRole('button', {
    name: 'Enviar a la papelera',
  })
  await expect(ofrecido).toBeVisible()
  await ofrecido.click()
  const enviado = page.locator('[data-sonner-toast]').filter({ hasText: 'se envió a la papelera' })
  await expect(enviado).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/vehiculos\\?origen=${t.terreno.corea.id}`))
  // Lo deja como estaba para la prueba siguiente.
  await enviado.getByRole('button', { name: 'Deshacer' }).click()
  await expect(menuDeVehiculo(page, OTRO)).toBeVisible()
})
