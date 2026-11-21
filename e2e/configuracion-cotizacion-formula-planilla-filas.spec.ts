// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerBorrador } from './soporte/formula-editor-guardar'
import {
  borrarLoDePrevia,
  sembrarBorradorConVariante,
  sembrarBorradorDePrevia,
  sembrarTabla,
  sembrarTipoDeCambio,
} from './soporte/formula-editor-previa'
import {
  a1De,
  abrirPlanilla,
  arrastrarFila,
  celdaDe,
  entradaDeLaCelda,
  filaDe,
  grilla,
  guardado,
  guardar,
  menuDeLaFila,
} from './soporte/planilla'

// Las filas de la planilla (`docs/UX.md` › «Cotización: fórmula (estados propios)»): insertar arriba y abajo (la fila nueva abre su concepto), duplicar, eliminar
// (rechazado con quién la usa; aceptado con «Deshacer»), mover con Alt+↑ (rechazado con su motivo si rompe el orden) y arrastrando su número, y «Se cotiza en par»
// en el panel de la variante. La fórmula es la de la vista previa (`formula-editor-previa.ts`): `base` = 900, `doble` = `=base*2` y el total = `=doble`.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origen = { id: '', nombre: '' }
let origenDeDos = { id: '', nombre: '' }
let origenDeTres = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-filas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fila Filas' })
  sembrarTipoDeCambio(proyecto, 7)
  sembrarTabla({ proyecto, origenId: null, factor: 0.5 })
  origen = await crearOrigenDeCotizar(proyecto, 'plfilas', false)
  sembrarBorradorDePrevia(origen.id, duena, proyecto)
  origenDeDos = await crearOrigenDeCotizar(proyecto, 'plpar2', false)
  sembrarBorradorConVariante(origenDeDos.id, duena, proyecto, ['c20', 'c40'])
  origenDeTres = await crearOrigenDeCotizar(proyecto, 'plpar3', false)
  sembrarBorradorConVariante(origenDeTres.id, duena, proyecto, ['a', 'b', 'c'])
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const numeroDe = (a1: string) => Number(a1.slice(1))
const filaConConcepto = (page: Page, concepto: string) =>
  grilla(page).locator('tr[data-fila]').filter({ hasText: concepto })

// La fila nueva abre su concepto con «Fila nueva» elegido: lo tipeado lo reemplaza. Devuelve su id.
async function nombrarLaNueva(page: Page, concepto: string): Promise<string> {
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await entradaDeLaCelda(page).pressSequentially(concepto)
  await entradaDeLaCelda(page).press('Enter')
  await expect(entradaDeLaCelda(page)).toBeHidden()
  await expect(filaConConcepto(page, concepto)).toHaveCount(1)
  return (await filaConConcepto(page, concepto).getAttribute('data-fila')) ?? ''
}

async function elegir(page: Page, renglon: string) {
  await page.getByRole('menuitem', { name: new RegExp(`^${renglon}`) }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
}

test('insertar arriba y abajo, duplicar y eliminar: rechazado con quién la usa, aceptado con «Deshacer»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const base = numeroDe(await a1De(page, 'base'))
  const doble = numeroDe(await a1De(page, 'doble'))

  await menuDeLaFila(page, 'base')
  await elegir(page, 'Insertar abajo')
  const seguro = await nombrarLaNueva(page, 'Seguro')
  expect(numeroDe(await a1De(page, seguro))).toBe(base + 1)

  await celdaDe(page, 'doble', 'A').click({ button: 'right' })
  await elegir(page, 'Insertar arriba')
  const otro = await nombrarLaNueva(page, 'Otro gasto')
  expect(numeroDe(await a1De(page, otro))).toBe(doble + 1)
  expect(numeroDe(await a1De(page, 'doble'))).toBe(doble + 2)
  // La referencia del total corre con su fila.
  await celdaDe(page, 'total').click()
  await expect(page.getByRole('textbox', { name: /^Fórmula de C\d+, Total$/ })).toHaveValue(
    `=C${String(doble + 2)}`,
  )

  await menuDeLaFila(page, 'doble')
  await elegir(page, 'Duplicar')
  await expect(filaConConcepto(page, 'Doble (copia)')).toHaveCount(1)
  expect(
    numeroDe(
      await a1De(
        page,
        (await filaConConcepto(page, 'Doble (copia)').getAttribute('data-fila')) ?? '',
      ),
    ),
  ).toBe(doble + 3)

  await menuDeLaFila(page, 'base')
  const eliminarBase = page.getByRole('menuitem', { name: /^Eliminar/ })
  await expect(eliminarBase).toBeDisabled()
  await expect(eliminarBase).toContainText(/La usan? C\d+/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  await menuDeLaFila(page, seguro)
  await elegir(page, 'Eliminar')
  await expect(filaDe(page, seguro)).toHaveCount(0)
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'Se eliminó «Seguro».' })
  await aviso.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await expect(filaDe(page, seguro)).toBeVisible()
  expect(numeroDe(await a1De(page, seguro))).toBe(base + 1)
})

test('Alt+↑ se rechaza con su motivo si rompe el orden; arrastrar el número mueve la fila', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  const base = await a1De(page, 'base')
  const doble = await a1De(page, 'doble')

  // `doble` usa `base`, justo arriba: no puede subir.
  await celdaDe(page, 'doble').click()
  await expect(filaDe(page, 'doble')).toHaveAttribute('data-activa', '')
  await page.keyboard.press('Alt+ArrowUp')
  await expect(
    page.getByText(`Esta fila usa ${base}: no puede quedar arriba de ella.`),
  ).toBeVisible()
  expect(await a1De(page, 'doble')).toBe(doble)

  // `base` no usa nada: arrastrada por su número antes de `remate`, queda primera.
  await arrastrarFila(page, 'base', 'remate', 'antes')
  await expect(celdaDe(page, 'base')).toHaveAttribute('data-celda', 'C1')
  // Y la fórmula de `doble` la sigue nombrando por su celda nueva.
  await celdaDe(page, 'doble').click()
  await expect(page.getByRole('textbox', { name: /^Fórmula de C\d+, Doble$/ })).toHaveValue('=C1*2')
})

test('«Se cotiza en par» se marca en el panel de la variante de dos opciones y queda en el borrador; con tres opciones va apagada', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origenDeDos.id)
  await menuDeLaFila(page, 'contenedor')
  await page.getByRole('menuitem', { name: 'Tipo de celda', exact: true }).click()
  await elegir(page, 'Variante')
  const panel = page.getByRole('dialog', { name: 'Tipo de celda: Variante' })
  const casilla = panel.getByRole('checkbox', { name: 'Se cotiza en par' })
  await expect(casilla).not.toBeChecked()
  await casilla.click()
  await expect(casilla).toBeChecked()
  await panel.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(panel).toBeHidden()
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  const nodos = (leerBorrador(origenDeDos.id)?.definicion.nodos ?? []) as unknown[]
  expect(nodos[0]).toMatchObject({ id: 'contenedor', en_par: true })

  await abrirPlanilla(page, origenDeTres.id)
  await menuDeLaFila(page, 'contenedor')
  await page.getByRole('menuitem', { name: 'Tipo de celda', exact: true }).click()
  await elegir(page, 'Variante')
  const apagada = page
    .getByRole('dialog', { name: 'Tipo de celda: Variante' })
    .getByRole('checkbox', { name: 'Se cotiza en par' })
  await expect(apagada).toBeDisabled()
  await expect(apagada).toHaveAccessibleDescription(
    'Sólo una variante de dos opciones se cotiza en par.',
  )
})
