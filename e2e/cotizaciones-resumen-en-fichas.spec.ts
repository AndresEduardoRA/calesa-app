import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Page } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El resumen de la cotización (`?cotizacion=`) abierto fuera de `/cotizaciones`: sobre la ficha del lead y la del vehículo trae su propia lectura, su barra y su «⋯»;
// «Abrir cotización» lleva a la página con «Volver» a la ficha y cerrarlo deja la ficha como estaba (`docs/UX.md` › «Cotizaciones»).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal
let sembrado: { ids: string[]; vehiculoId: string | null; leadId: string }

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  sembrado = await sembrarParaMarcar(t, 'Resumen en fichas', { cuantas: 2 })
})

test.afterAll(async () => {
  await limpiarFinal()
})

const numeroDe = (id: string): string =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`).trim()

async function probar(page: Page, ficha: string, info: Parameters<typeof capturar>[1]) {
  const id = sembrado.ids[1] ?? ''
  await entrar(page, t.duena, { fresco: true })
  await page.goto(ficha)
  // La ficha, sin el resumen: la clave no está en la URL.
  await expect(page.getByRole('dialog', { name: /^Cotización n\.º/ })).toHaveCount(0)

  await page.goto(`${ficha}?cotizacion=${id}`)
  const drawer = page.getByRole('dialog', { name: `Cotización n.º ${numeroDe(id)}` })
  await expect(drawer).toBeVisible()
  // Su lectura (la cotización no estaba en ninguna página), su barra y su «⋯».
  await expect(drawer.getByText('Preventa')).toBeVisible()
  await expect(drawer.getByRole('tab')).toHaveCount(5)
  await expect(drawer.getByRole('button', { name: 'Compartir cotización' })).toBeVisible()
  await expect(
    drawer.getByRole('button', { name: `Más acciones de N.º ${numeroDe(id)}` }),
  ).toBeVisible()
  await capturar(page, info, 'resumen-en-la-ficha')

  // «Abrir cotización» lleva a la página con «Volver» a la ficha.
  const abrir = drawer.getByRole('link', { name: 'Abrir cotización' })
  await expect(abrir).toHaveAttribute('href', new RegExp(`^/cotizaciones/${id}\\?returnTo=`))
  await abrir.click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${id}\\?returnTo=`))
  await page.getByRole('link', { name: 'Volver' }).click()
  await expect(page).toHaveURL(new RegExp(`${ficha}$`))

  // Cerrar el resumen deja la ficha como estaba.
  await page.goto(`${ficha}?cotizacion=${id}`)
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`${ficha}$`))
}

test('E2E sobre la ficha del lead, el resumen trae su lectura, su barra y su «⋯», y cerrarlo deja la ficha', async ({
  page,
}, info) => {
  await probar(page, `/leads/${sembrado.leadId}`, info)
})

test('E2E sobre la ficha del vehículo, el resumen abre y cierra sin tocar la ficha', async ({
  page,
}, info) => {
  await probar(page, `/vehiculos/${sembrado.vehiculoId ?? ''}`, info)
})

test('E2E una cotización que no existe dice que no está disponible sobre la ficha', async ({
  page,
}) => {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/leads/${sembrado.leadId}?cotizacion=00000000-0000-4000-8000-00000000dead`)
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText(
    'Esta cotización ya no está disponible: no existe o ya no tienes acceso.',
  )
})
