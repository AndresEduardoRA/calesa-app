// @sin-celular-archivo: el perfil en tarjetas no cambia con el ancho (una columna en el celular); sus modales son los de las demás tarjetas de ajustes
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { editarTarjeta } from './soporte/empresa'
import { literal, sql } from './soporte/sql'

// `/perfil` son tarjetas con lo guardado a la vista y un modal por tarjeta (`?panel=`): Tú, Preferencias, Turnos de la web, Tu ficha en la web y Notificaciones.
// Aquí lo que no prueban los specs de cada parte: el `PT409` del modal «Tú», el `?panel=` y el ancla `#notificaciones` por la URL, las preferencias que se
// aplican al elegirlas y que a 1440×900 la página entra entera.
test.describe.configure({ mode: 'serial' })

const NOMBRE = 'Paula Tarjetas'
let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-perfil-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: NOMBRE })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

const nombreGuardado = () =>
  sql(`select nombre from public.perfiles where email = ${literal(duena)}`)

test('las tarjetas muestran lo guardado y no hay plegables', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil')
  for (const titulo of ['Tú', 'Preferencias', 'Turnos de la web', 'Notificaciones']) {
    await expect(page.getByRole('region', { name: titulo, exact: true })).toBeVisible()
  }
  const tu = page.getByRole('region', { name: 'Tú', exact: true })
  await expect(tu).toContainText(NOMBRE)
  await expect(tu).toContainText(duena)
  await expect(page.getByRole('region', { name: 'Preferencias', exact: true })).toContainText(
    'Ítems por página',
  )
  await expect(page.locator('main details')).toHaveCount(0)
})

test('«Tú» guarda el nombre; si otra pestaña guardó antes, «Recargar» conserva lo tipeado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil')
  const tu = await editarTarjeta(page, 'Tú')
  await tu.getByLabel('Nombre y apellido').fill('Paula Nueva')

  sql(
    `update public.perfiles set actualizado_en = clock_timestamp() where email = ${literal(duena)}`,
  )
  await tu.getByRole('button', { name: 'Guardar', exact: true }).click()
  const recargar = tu.getByRole('button', { name: 'Recargar' })
  await expect(recargar).toBeVisible()
  expect(nombreGuardado()).toBe(NOMBRE)
  await recargar.click()
  await expect(recargar).toBeHidden()
  await expect(tu.getByLabel('Nombre y apellido')).toHaveValue('Paula Nueva')

  await tu.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Perfil guardado')).toBeVisible()
  await expect(tu).toBeHidden()
  await expect(page.getByRole('region', { name: 'Tú', exact: true })).toContainText('Paula Nueva')
  expect(nombreGuardado()).toBe('Paula Nueva')
  sql(`update public.perfiles set nombre = ${literal(NOMBRE)} where email = ${literal(duena)}`)
})

test('?panel=preferencias abre su modal y elegir se aplica y se guarda al instante', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil?panel=preferencias')
  const modal = page.getByRole('dialog', { name: 'Preferencias', exact: true })
  await expect(modal).toBeVisible()
  await modal
    .getByRole('group', { name: 'Ítems por página' })
    .getByText('25', { exact: true })
    .click()
  await modal.getByRole('group', { name: 'Tema' }).getByText('Oscuro', { exact: true }).click()
  await expect
    .poll(() =>
      sql(
        `select pu.valor::text from public.preferencias_usuario pu join public.perfiles p on p.id = pu.usuario_id where p.email = ${literal(duena)} and pu.clave = 'listas.por_pagina'`,
      ),
    )
    .toBe('25')
  await modal.getByRole('button', { name: 'Listo' }).click()
  await expect(modal).toBeHidden()
  const tarjeta = page.getByRole('region', { name: 'Preferencias', exact: true })
  await expect(tarjeta).toContainText('Oscuro')
  await expect(tarjeta).toContainText('25')
  // Lo deja como estaba para los demás specs.
  const otra = await editarTarjeta(page, 'Preferencias')
  await otra.getByRole('group', { name: 'Tema' }).getByText('Claro', { exact: true }).click()
  sql(
    `delete from public.preferencias_usuario where clave = 'listas.por_pagina' and usuario_id = (select id from public.perfiles where email = ${literal(duena)})`,
  )
})

test('/perfil#notificaciones abre el modal de Notificaciones y quita el ancla', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil#notificaciones')
  await expect(page.getByRole('dialog', { name: 'Notificaciones', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/perfil\?panel=notificaciones$/)
})

// A 1440×900 la página entra entera: sin desplazar la página ni el `main`.
async function sobra(page: Page) {
  return page.evaluate(() => {
    const pagina = document.scrollingElement
    const principal = document.querySelector('main')
    return {
      pagina: pagina ? pagina.scrollHeight - window.innerHeight : 0,
      principal: principal ? principal.scrollHeight - principal.clientHeight : 0,
    }
  })
}

test('a 1440×900 el perfil no se desplaza', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await contexto.newPage()
  try {
    await entrar(page, duena, { fresco: true })
    await page.goto('/perfil')
    await expect(page.getByRole('region', { name: 'Notificaciones', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Turnos de la web', exact: true })).toBeVisible()
    const medida = await sobra(page)
    expect(medida, 'lo que sobra en px').toEqual({ pagina: 0, principal: 0 })
  } finally {
    await contexto.close()
  }
})
