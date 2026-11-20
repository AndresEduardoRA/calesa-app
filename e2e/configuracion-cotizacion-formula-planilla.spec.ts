// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { formatearMonto } from '../src/shared/lib/formato'
import { expect, test, type Page } from './soporte/prueba'
import { enLaPestana } from './soporte/pestanas-del-origen'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  FILA_CON_TEXTO,
  abrirModoAvanzado,
  publicarFormulaConTexto,
} from './soporte/formula-editor'
import { publicarPlantillaDeLaMini } from './soporte/plantilla'
import { literal, sql } from './soporte/sql'

// La planilla de la fórmula (`docs/UX.md` › «Cotización: fórmula (estados propios)»): la vista por defecto de la pestaña «Fórmula», con las cuatro columnas de V1 y
// la frase de lo que se edita; cambiar una constante en C mueve «Totales» y la tarjeta en vivo; un cálculo se edita en la barra de fórmula; la unidad de ejemplo
// se tipea en su banda; se guarda el borrador y se publica con nota; el Modo avanzado (`?panel=editar-formula`) muestra lo aplicado y «Volver a la planilla» vuelve.
// La fórmula de prueba con texto (`formula-editor.ts`): `con_ayuda` es una constante de 5 en el grupo `gpub`, `pub` un input del mismo grupo (en la variante por
// defecto), `comision` = `=pub*4%` (fuera del total) y lo demás vale 0; el total en dólares es la moneda local ÷ el mismo tipo de cambio. La tarjeta es la de grupos
// (forma 1) con sus dos grupos, publicada.

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-planilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Planilla' })
  origen = await crearOrigenDeCotizar(proyecto, 'planilla', false)
  publicarFormulaConTexto(origen.id)
  publicarPlantillaDeLaMini(origen.id, {
    grupos: [{ grupo: 'gpub' }, { grupo: 'gx' }],
    total: { etiqueta: 'Total' },
    logo: false,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const usd = (valor: number) => formatearMonto(valor, { moneda: 'USD', locale: 'es-BO' })
const planilla = (page: Page) => page.getByRole('region', { name: 'Planilla de la fórmula' })
const filaDe = (page: Page, id: string) => planilla(page).locator(`tr[data-fila="${id}"]`)

async function tipearEnLaCelda(page: Page, concepto: string, valor: string) {
  await planilla(page)
    .getByRole('button', { name: new RegExp(`^${concepto}, valor`) })
    .click()
  const entrada = planilla(page).getByRole('textbox', { name: `${concepto}, valor`, exact: true })
  await entrada.fill(valor)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

test('la planilla: constante, barra de fórmula, unidad de ejemplo, guardar, publicar y el Modo avanzado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/formula`)
  await enLaPestana(page, 'Fórmula')

  // (1) La planilla con sus cuatro columnas y la frase.
  for (const columna of ['A · concepto', 'B · %', 'C · valor', 'D · de dónde sale']) {
    await expect(
      planilla(page).getByRole('columnheader', { name: columna, exact: true }),
    ).toBeVisible()
  }
  await expect(
    planilla(page).getByText(
      'Las celdas que se editan están marcadas. Todo lo demás se calcula, igual que en la planilla.',
    ),
  ).toBeVisible()
  const totales = planilla(page).getByRole('region', { name: 'Totales' })
  const tarjeta = planilla(page).locator('[data-tarjeta-de-cotizacion]')
  await expect(totales).toContainText(usd(5))
  await expect(tarjeta).toContainText(usd(5))
  await expect(filaDe(page, FILA_CON_TEXTO.id)).toContainText(/Pública × 4\s?%/)

  // (2) Cambiar una constante en C: «Totales» y la tarjeta en vivo cambian.
  await tipearEnLaCelda(page, 'Con ayuda', '7')
  await expect(totales).toContainText(usd(7))
  await expect(tarjeta).toContainText(usd(7))

  // (3) Elegir un cálculo, editarlo en la barra de fórmula y aplicar con Ctrl+Enter.
  await planilla(page)
    .getByRole('button', { name: `Elegir ${FILA_CON_TEXTO.etiqueta}` })
    .click()
  const barra = planilla(page).getByRole('region', { name: 'Barra de fórmula' })
  const texto = barra.getByRole('textbox', { name: `Texto de ${FILA_CON_TEXTO.etiqueta}` })
  await expect(texto).toHaveValue(FILA_CON_TEXTO.texto)
  await texto.fill('=pub*5%')
  await expect(barra.getByRole('button', { name: 'Aplicar', exact: true })).toBeVisible()
  await texto.press('Control+Enter')
  await expect(barra.getByRole('button', { name: 'Aplicar', exact: true })).toHaveCount(0)
  await expect(texto).toHaveValue('=pub*5%')
  await expect(filaDe(page, FILA_CON_TEXTO.id)).toContainText(/Pública × 5\s?%/)

  // (4) La unidad de ejemplo: tipear «Pública» mueve el cálculo y los totales.
  await tipearEnLaCelda(page, 'Pública', '100')
  await expect(filaDe(page, FILA_CON_TEXTO.id)).toContainText(usd(5))
  await expect(totales).toContainText(usd(107))
  await expect(tarjeta).toContainText(usd(107))

  // (5) Guardar el borrador y publicarlo con nota.
  await planilla(page).getByRole('button', { name: 'Guardar el borrador', exact: true }).click()
  await expect(planilla(page).locator('[data-guardado] [role="status"]')).toHaveText(
    'Se guardó el borrador.',
  )
  const borrador = page.getByRole('region', { name: 'Borrador' })
  await borrador.getByRole('button', { name: 'Publicar…', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Desde la planilla')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  const publicada = (columna: string) =>
    sql(
      `select ${columna} from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    )
  await expect.poll(() => publicada('version')).toBe('2')
  expect(publicada(`params ->> 'con_ayuda'`)).toBe('7')
  expect(
    publicada(
      `(select n ->> 'texto' from jsonb_array_elements(definicion -> 'nodos') n where n ->> 'id' = '${FILA_CON_TEXTO.id}')`,
    ),
  ).toBe('=pub*5%')

  // (6) El Modo avanzado muestra lo aplicado; (7) «Volver a la planilla».
  await abrirModoAvanzado(page)
  const filaAvanzada = page
    .getByRole('list', { name: 'Filas de la fórmula' })
    .locator(`li[data-fila="${FILA_CON_TEXTO.id}"]`)
  await expect(filaAvanzada).toContainText('=pub*5%')
  await page.getByRole('button', { name: 'Volver a la planilla', exact: true }).click()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(
    planilla(page).getByRole('columnheader', { name: 'C · valor', exact: true }),
  ).toBeVisible()
})
