import { entrar } from './soporte/alta'
import {
  cerrarElMenu,
  filas,
  limpiarListadoDeAcciones,
  lineasDelMenu,
  marcasEnLaBase,
  menuDe,
  prepararListadoDeAcciones,
  type TerrenoDeLasAcciones,
} from './soporte/listado-de-cotizaciones-acciones'
import { expect, test } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// La columna de acciones del listado `/cotizaciones` (T15, `docs/UX.md` › «Cotizaciones»): el «⋯» de cada fila ofrece, según el rol, aprobar, marcar final, favorita, reportar,
// invalidar o reactivar y enviar a la papelera, con las mismas actions y los mismos diálogos de la guardada (en la URL, con `?para=`). Las reglas de cada una ya tienen sus pruebas
// (SQL y de la guardada): acá se mira que la columna las llame y que quien no puede no las vea. El terreno es `soporte/listado-de-cotizaciones-acciones.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDeLasAcciones

test.beforeAll(async ({}, info) => {
  terreno = await prepararListadoDeAcciones(info.project.name)
})

test.afterAll(async () => {
  await limpiarListadoDeAcciones()
})

test('E2E la dueña marca favorita, reporta, invalida y reactiva desde el «⋯» de la fila', async ({
  page,
}) => {
  await entrar(page, terreno.t.duena, { fresco: true })
  const [a = ''] = terreno.ids
  const n = terreno.numeros[0]
  // La dueña lo ve todo: aprobar, marcar final, favorita, reportar, invalidar y la papelera, en bloques y con la destructiva al final.
  let menu = await menuDe(page, n)
  expect(await lineasDelMenu(menu)).toEqual(
    expect.arrayContaining([
      'Aprobar',
      'Marcar final…',
      'Reportar…',
      'Invalidar…',
      'Enviar a la papelera',
      'Favorita',
    ]),
  )
  await expect(menu.getByRole('menuitem', { name: 'Reactivar…' })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: 'Descartar los reportes…' })).toHaveCount(0)

  // Favorita: cambia al tocar y la base la guarda; recargar la conserva.
  await menu.getByRole('menuitemcheckbox', { name: 'Favorita' }).click()
  await expect.poll(() => marcasEnLaBase(a)).toBe('activa · 0 · true')
  await page.reload()
  await expect(filas(page)).toHaveCount(1)
  await page
    .getByRole('button', { name: `Más acciones de N.º ${n}` })
    .filter({ visible: true })
    .click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Favorita' })).toBeChecked()
  await cerrarElMenu(page)

  // Reportar: abre el modal de la guardada sobre esa fila, en la URL.
  menu = await menuDe(page, n)
  await menu.getByRole('menuitem', { name: 'Reportar…' }).click()
  await expect(page).toHaveURL(/panel=reportar/)
  await expect(page).toHaveURL(/para=/)
  const modal = page.getByRole('dialog', { name: /Reportar la cotización n\.º/ })
  await modal.getByRole('textbox', { name: '¿Qué está mal?' }).fill('El precio no cuadra')
  await modal.getByRole('button', { name: 'Enviar el reporte' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByText('Reporte enviado.', { exact: true })).toBeVisible()
  await expect.poll(() => marcasEnLaBase(a)).toBe('activa · 1 · true')

  // Con un reporte, la dueña puede descartarlos; el «Reportar…» dice que ya reportó.
  menu = await menuDe(page, n)
  await expect(menu.getByRole('menuitem', { name: 'Reportaste esta cotización…' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Descartar los reportes…' })).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Invalidar…' }).click()
  await expect(page).toHaveURL(/panel=moderar&accion=invalidar/)
  const confirmar = page.getByRole('dialog', { name: /Invalidar la cotización n\.º/ })
  await expect(confirmar.getByText('El precio no cuadra', { exact: true })).toBeVisible()
  await confirmar.getByRole('button', { name: 'Invalidar', exact: true }).click()
  await expect(confirmar).toBeHidden()
  await expect.poll(() => marcasEnLaBase(a)).toBe('invalida · 1 · true')

  // Una inválida ofrece «Reactivar…», y «Aprobar» queda apagada con su motivo.
  menu = await menuDe(page, n)
  await expect(menu.getByRole('menuitem', { name: 'Invalidar…' })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: 'Aprobar' })).toBeDisabled()
  await expect(menu.getByText('Una cotización inválida no se aprueba.')).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Reactivar…' }).click()
  const reactivar = page.getByRole('dialog', { name: /Reactivar la cotización n\.º/ })
  await reactivar.getByRole('button', { name: 'Reactivar', exact: true }).click()
  await expect(reactivar).toBeHidden()
  await expect.poll(() => marcasEnLaBase(a)).toBe('activa · 0 · true')
})

test('E2E la dueña aprueba una y manda otra a la papelera con «Deshacer»', async ({ page }) => {
  await entrar(page, terreno.t.duena, { fresco: true })
  const aprobada = () =>
    sql(
      `select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = ${literal(terreno.vehiculoId)}::uuid`,
    )
  const enLaPapelera = (id: string) =>
    sql(
      `select (eliminado_en is not null)::text from public.cotizaciones where id = ${literal(id)}::uuid`,
    )
  // Moderar la primera dejó una aprobada (la base repone la más antigua activa): se aprueba otra, y una tercera va a la papelera.
  const actual = aprobada()
  const i = terreno.ids[1] === actual ? 2 : 1
  const otros = [0, 1, 2].filter((k) => k !== i)
  const j = otros.find((k) => terreno.ids[k] !== actual) ?? otros[0] ?? 0
  const [x = '', y = ''] = [terreno.ids[i], terreno.ids[j]]
  const [nx = '', ny = ''] = [terreno.numeros[i], terreno.numeros[j]]

  // Aprobar se hace de una, sin preguntar; la fila ya no lo ofrece.
  let menu = await menuDe(page, nx)
  await menu.getByRole('menuitem', { name: 'Aprobar' }).click()
  await expect(
    page.getByText(`La n.º ${nx} es la aprobada del vehículo.`, { exact: true }),
  ).toBeVisible()
  await expect.poll(aprobada).toBe(x)
  menu = await menuDe(page, nx)
  await expect(menu.getByRole('menuitem', { name: 'Aprobar' })).toHaveCount(0)
  await cerrarElMenu(page)
  await expect(filas(page).getByText('Aprobada')).toBeVisible()

  // La papelera: sin preguntar, con «Deshacer»; la fila se va y vuelve.
  menu = await menuDe(page, ny)
  await menu.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(filas(page)).toHaveCount(0)
  await expect.poll(() => enLaPapelera(y)).toBe('true')
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(() => enLaPapelera(y)).toBe('false')
  await expect(filas(page)).toHaveCount(1)
})

test('E2E la dueña marca la final desde el «⋯»: pide confirmar y deja lo mismo que en la guardada', async ({
  page,
}) => {
  await entrar(page, terreno.t.duena, { fresco: true })
  const [a = '', b = ''] = terreno.ids
  const menu = await menuDe(page, terreno.numeros[0])
  await menu.getByRole('menuitem', { name: 'Marcar final…' }).click()
  await expect(page).toHaveURL(/panel=marcar-final/)
  await expect(page).toHaveURL(/para=/)
  const dialogo = page.getByRole('dialog', { name: /Marcar como final la cotización n\.º/ })
  await dialogo.getByRole('button', { name: 'Marcar final' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByText(`Marcaste la n.º ${terreno.numeros[0]} como final.`)).toBeVisible()
  const clase = (id: string) =>
    sql(`select clase::text from public.cotizaciones where id = ${literal(id)}::uuid`)
  await expect.poll(() => clase(a)).toBe('final')
  // La aprobada (la otra preventa viva del vehículo) fue a la papelera de quien marcó.
  expect(
    sql(
      `select (eliminado_en is not null)::text from public.cotizaciones where id = ${literal(b)}::uuid`,
    ),
  ).toBe('true')
  // Una final ya no ofrece «Marcar final…».
  const despues = await menuDe(page, terreno.numeros[0])
  await expect(despues.getByRole('menuitem', { name: 'Marcar final…' })).toHaveCount(0)
})

test('E2E cada rol ve en el «⋯» sólo lo suyo: quien sólo ve, compartir, favorita y reportar; quien modera, invalidar', async ({
  page,
}) => {
  // Quien sólo ve cotizaciones: compartir, favorita y reportar; nada de aprobar, marcar final, moderar ni papelera.
  await entrar(page, terreno.t.soloVer, { fresco: true })
  let menu = await menuDe(page, terreno.numeroDeAna)
  expect((await lineasDelMenu(menu)).toSorted()).toEqual(['Favorita', 'Reportar…'])
  await cerrarElMenu(page)

  // Ana ve y edita lo suyo: puede mandar su cotización a la papelera y hacerla privada (la creó ella), pero no aprobar, marcar final ni moderar.
  await page.context().clearCookies()
  await entrar(page, terreno.t.ana, { fresco: true })
  menu = await menuDe(page, terreno.numeroDeAna)
  expect((await lineasDelMenu(menu)).toSorted()).toEqual([
    'Enviar a la papelera',
    'Favorita',
    'Hacer privada',
    'Reportar…',
  ])
  await cerrarElMenu(page)

  // Quien modera: invalidar y la papelera de una preventa ajena, sin marcar final ni aprobar.
  await page.context().clearCookies()
  await entrar(page, terreno.moderadora, { fresco: true })
  menu = await menuDe(page, terreno.numeroDeAna)
  expect((await lineasDelMenu(menu)).toSorted()).toEqual([
    'Enviar a la papelera',
    'Favorita',
    'Invalidar…',
    'Reportar…',
  ])
  await cerrarElMenu(page)
  // En una final, moderar pide gestionar finales: no ofrece moderarla.
  menu = await menuDe(page, terreno.numeros[0])
  expect((await lineasDelMenu(menu)).toSorted()).toEqual(['Favorita', 'Reportar…'])
})
