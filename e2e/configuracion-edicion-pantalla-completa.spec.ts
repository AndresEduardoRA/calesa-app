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
import { FILA_CON_TEXTO, publicarFormulaConTexto } from './soporte/formula-editor'
import { publicarPlantillaDeLaMini } from './soporte/plantilla'
import {
  a1De,
  abrirPlanilla,
  celdaDe,
  escribirEnLaCelda,
  grilla,
  sembrarFletes,
} from './soporte/planilla'
import { urlDeLaFormula } from './soporte/rutas-de-la-formula'

// La edición a pantalla completa (`docs/UX.md` › «Edición a pantalla completa»): «Editar» en la planilla, la hoja, la tarjeta, una tabla y el flujo esconde el menú,
// la barra de arriba y el menú de Configuración; deja la barra propia con «‹ Salir», el camino, el estado y las acciones; vive en `?editar=si` (recargar lo mantiene);
// Esc es del editor y salir con cambios sin guardar pregunta como siempre.

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-pantalla-completa-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pantalla Completa' })
  origen = await crearOrigenDeCotizar(proyecto, 'pcompleta', false)
  publicarFormulaConTexto(origen.id)
  sembrarFletes(origen.id)
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

const menuLateral = (page: Page) => page.locator('[data-barra-lateral]')
const salir = (page: Page) => page.getByRole('link', { name: 'Salir', exact: true })

// El marco escondido y la barra propia a la vista, con su título (el `h1`).
async function enLaEdicion(page: Page, titulo: string) {
  await expect(page).toHaveURL(/[?&]editar=si/)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(salir(page)).toBeVisible()
  await expect(menuLateral(page)).toBeHidden()
}

async function fueraDeLaEdicion(page: Page) {
  await expect(page).not.toHaveURL(/[?&]editar=si/)
  await expect(menuLateral(page)).toBeVisible()
  await expect(salir(page)).toHaveCount(0)
}

test('E2E escritorio · la planilla a pantalla completa: entrar, recargar, Esc, preguntar al salir con cambios', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirPlanilla(page, origen.id)
  await fueraDeLaEdicion(page)

  await page.getByRole('link', { name: 'Editar la planilla' }).click()
  await enLaEdicion(page, 'Planilla')
  await expect(page.getByText('Publicada v1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar el borrador' })).toBeVisible()

  // Recargar mantiene el modo; Esc es del editor y no sale.
  await page.reload()
  await enLaEdicion(page, 'Planilla')
  await page.keyboard.press('Escape')
  await enLaEdicion(page, 'Planilla')
  await expect(grilla(page)).toBeVisible()

  // Con un cambio, la barra lo dice y «Salir» pregunta: «Seguir editando» se queda y «Descartar» vuelve a la planilla.
  await escribirEnLaCelda(page, celdaDe(page, FILA_CON_TEXTO.id), `=${await a1De(page, 'pub')}*5%`)
  await expect(page.getByText('Cambios sin guardar')).toBeVisible()
  await salir(page).click()
  await expect(page.getByRole('alert').getByText('Tienes cambios sin guardar.')).toBeVisible()
  await page.getByRole('button', { name: 'Seguir editando' }).click()
  await enLaEdicion(page, 'Planilla')
  await salir(page).click()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await fueraDeLaEdicion(page)
  await expect(page).toHaveURL(/\/formulas\/[0-9a-f-]{36}\/planilla$/)
})

test('E2E escritorio · la hoja y la tarjeta a pantalla completa: entrar con «Editar» y volver con «Salir»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  for (const [parte, titulo, enlace] of [
    ['hoja', 'Hoja', 'Editar la hoja'],
    ['tarjeta', 'Tarjeta', 'Editar la tarjeta'],
  ] as const) {
    await page.goto(urlDeLaFormula(origen.id, parte))
    await fueraDeLaEdicion(page)
    await page.getByRole('link', { name: enlace }).click()
    await enLaEdicion(page, titulo)
    await salir(page).click()
    await fueraDeLaEdicion(page)
    await expect(page).toHaveURL(new RegExp(`/formulas/[0-9a-f-]{36}/${parte}$`))
  }
})

test('E2E escritorio · una tabla y el flujo a pantalla completa', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/tablas`)
  await fueraDeLaEdicion(page)
  const lista = page.getByRole('list', { name: `Tablas de referencia de ${origen.nombre}` })
  await lista.getByRole('link', { name: 'Fletes' }).click()
  await enLaEdicion(page, 'Tabla')
  await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeDisabled()
  await salir(page).click()
  await fueraDeLaEdicion(page)
  await expect(page).toHaveURL(new RegExp(`/origenes/${origen.id}/tablas$`))

  await page.goto(`/configuracion/origenes/${origen.id}/flujo`)
  await fueraDeLaEdicion(page)
  await page.getByRole('link', { name: 'Editar el flujo' }).click()
  await enLaEdicion(page, 'Flujo')
  await expect(page.getByRole('button', { name: 'Reglas del flujo' })).toBeVisible()
  await salir(page).click()
  await fueraDeLaEdicion(page)
  await expect(page).toHaveURL(new RegExp(`/origenes/${origen.id}/flujo$`))
})
