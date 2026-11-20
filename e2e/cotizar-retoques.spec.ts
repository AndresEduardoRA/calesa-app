import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { tipearEnLaHoja } from './soporte/cotizar-guardar'
import { guardarLaHojaAbierta, leerElPdf } from './soporte/cotizar-pdf'
import { abrirLaHoja, alDia } from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import {
  copiarLaFormulaDeLaSubasta,
  crearVehiculo,
  publicarComoLaDuena,
  urlDeLaHoja,
} from './soporte/tarjeta-cuadricula'

// Los retoques de la tarjeta (`docs/COTIZADOR.md` › «Retoques de la tarjeta», `docs/UX.md` › «Cotización guardada»): en la vista previa de una guardada, quien la
// puede guardar entra en «Retocar», cambia un texto y oculta una fila; «Listo» lo guarda y vale en la vista previa, el PDF, «Revisiones» y la imagen de la tarjeta (otra ETag); «Volver a
// la plantilla» lo deshace. Quien sólo ve no tiene «Retocar», y tras publicar una plantilla sin esa celda el modo dice que el retoque ya no aplica. Un origen
// propio con la fórmula de la subasta y la réplica de V1 publicada: nunca la plantilla de la semilla.
test.describe.configure({ mode: 'serial' })

const RAIZ = 'retoques_'
type Celda = { id: string; fila: string; contenido: Record<string, unknown> }
const REPLICA = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/tarjeta/plantilla-como-v1-usa.json', 'utf8'),
) as { celdas: Celda[] }
const NOTA = 'Esta es una cotización referencial'

let duena = ''
let soloVe = ''
let lead = ''
let origen = ''
let vehiculo = ''
let guardada = ''

const vistaPrevia = (page: Page) => page.getByRole('dialog', { name: 'Vista previa' })
const modo = (page: Page) => page.getByRole('dialog', { name: 'Retocar la tarjeta' })
const tarjetaDe = (page: Page) =>
  vistaPrevia(page).getByRole('group', { name: 'Tarjeta de la cotización' })
const retoquesGuardados = () =>
  sql(
    `select coalesce(tarjeta_retoques::text, '') from public.cotizaciones where id = ${literal(guardada)}::uuid`,
  )
// La ETag de la imagen de la tarjeta para quien mira: cambia con los retoques (la huella mira todo lo que el dibujo lee).
const etiquetaDeLaImagen = async (page: Page) =>
  (await page.request.get(`/cotizaciones/${guardada}/imagen`)).headers()['etag'] ?? ''

function borrarLoDeEsteSpec(): void {
  const mios = `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`
  sql(`
    delete from public.cotizaciones where origen_id in (${mios});
    delete from public.vehiculos where origen_id in (${mios});
    delete from public.origenes where id in (${mios})`)
}

async function abrirLaVistaPreviaDeLaGuardada(page: Page) {
  await page.goto(`/cotizaciones/${guardada}?panel=vista-previa`)
  await expect(tarjetaDe(page)).toBeVisible({ timeout: 15_000 })
}

async function entrarAlModo(page: Page) {
  await abrirLaVistaPreviaDeLaGuardada(page)
  await vistaPrevia(page).getByRole('button', { name: 'Retocar' }).click()
  await expect(modo(page).locator('[data-modo-retocar]')).toBeVisible()
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-retoques-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Retoques' })
  lead = await crearLead({
    nombre: `retoques ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  origen = (
    await crearOrigenDePrueba(`E2E retoques ${proyecto}`, `${RAIZ}${proyecto}`, {
      tipo: 'subasta',
    })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  vehiculo = await crearVehiculo(origen, `Retoques Hilux ${proyecto}`)
  await publicarComoLaDuena(duena, origen, REPLICA)
  soloVe = correoDePrueba(`solo-ve-retoques-${proyecto}`)
  await crearPersona({
    email: soloVe,
    contrasena: CONTRASENA,
    nombre: 'Vera Solove',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloVe,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo ve retoques`, clave: 'e2e_solo_ve_retoques' },
    permisos: ['cotizaciones.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E retocar, ver en el PDF y en Revisiones, y volver a la plantilla', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await abrirLaHoja(page, duena, urlDeLaHoja(origen, lead, vehiculo))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  guardada = await guardarLaHojaAbierta(page)
  const etiquetaAntes = await etiquetaDeLaImagen(page)
  expect(etiquetaAntes).toMatch(/^"i-[0-9a-f]{32}\./)

  await abrirLaVistaPreviaDeLaGuardada(page)
  await capturar(page, info, 'retoques-antes')
  await vistaPrevia(page).getByRole('button', { name: 'Retocar' }).click()
  await expect(modo(page).locator('[data-modo-retocar]')).toBeVisible()
  await capturar(page, info, 'retoques-modo')
  await modo(page).getByRole('button', { name: 'Cambiar el texto «Asesor:»' }).click()
  const campo = modo(page).getByRole('textbox', { name: 'Texto de la celda' })
  await campo.fill('Para Juan')
  await expect(modo(page).getByText('9 de 300')).toBeVisible()
  await capturar(page, info, 'retoques-campo')
  await campo.press('Enter')
  await expect(campo).toBeHidden()
  await modo(page)
    .getByRole('button', { name: new RegExp(`^Ocultar la fila «Nota: ${NOTA}`) })
    .click()
  await expect(modo(page).locator('[data-fila-oculta-por-retoque="nota"]')).toBeAttached()
  await capturar(page, info, 'retoques-fila-oculta')
  await modo(page).getByRole('button', { name: 'Listo' }).click()

  // La página vuelve con la versión nueva: la tarjeta retocada, sin la fila.
  await expect(tarjetaDe(page).getByText('Para Juan')).toBeVisible({ timeout: 15_000 })
  await expect(tarjetaDe(page).getByText(NOTA, { exact: false })).toHaveCount(0)
  await capturar(page, info, 'retoques-despues')
  expect(JSON.parse(retoquesGuardados())).toEqual({
    celdas: { asesor: 'Para Juan' },
    filas_ocultas: ['nota'],
  })
  const pdf = (await leerElPdf(page, guardada)).lineas.join('\n')
  expect(pdf).toContain('Para Juan')
  expect(pdf).not.toContain(NOTA)
  expect(await etiquetaDeLaImagen(page)).not.toBe(etiquetaAntes)

  await page.goto(`/cotizaciones/${guardada}?panel=revisiones`)
  await expect(page.getByText('Retocó la tarjeta').first()).toBeVisible({ timeout: 15_000 })

  await entrarAlModo(page)
  await modo(page).getByRole('button', { name: 'Más acciones de la tarjeta' }).click()
  await page.getByRole('menuitem', { name: 'Volver a la plantilla' }).click()
  await expect(modo(page).getByText('¿Volver a la plantilla?')).toBeVisible()
  await modo(page).getByRole('button', { name: 'Volver a la plantilla' }).click()
  await expect(tarjetaDe(page).getByText('Asesor:')).toBeVisible({ timeout: 15_000 })
  await expect(tarjetaDe(page).getByText(NOTA, { exact: false })).toBeVisible()
  expect(retoquesGuardados()).toBe('')
})

test('E2E quien sólo ve no tiene «Retocar»', async ({ page }) => {
  expect(guardada).not.toBe('')
  await page.context().clearCookies()
  await entrar(page, soloVe, { fresco: true })
  await abrirLaVistaPreviaDeLaGuardada(page)
  await expect(vistaPrevia(page).getByRole('button', { name: 'Copiar texto' })).toBeVisible()
  await expect(vistaPrevia(page).getByRole('button', { name: 'Retocar' })).toHaveCount(0)
})

test('E2E un retoque que ya no aplica; con el texto al 200 % el campo va a lo ancho', async ({
  page,
}, info) => {
  expect(guardada).not.toBe('')
  sql(
    `update public.cotizaciones set tarjeta_retoques = '{"celdas": {"asesor": "Para Juan"}}'::jsonb where id = ${literal(guardada)}::uuid`,
  )
  await publicarComoLaDuena(duena, origen, {
    ...REPLICA,
    celdas: REPLICA.celdas.filter((c) => c.id !== 'asesor'),
  })
  await page.context().clearCookies()
  await entrar(page, duena, { fresco: true })
  await abrirLaVistaPreviaDeLaGuardada(page)
  await expect(tarjetaDe(page).getByText('Para Juan')).toHaveCount(0)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await vistaPrevia(page).getByRole('button', { name: 'Retocar' }).click()
  await expect(modo(page).locator('[data-retoques-no-aplican]')).toHaveText(
    '1 retoque ya no aplica: se quitará al guardar.',
  )
  await modo(page).getByRole('button', { name: 'Cambiar el texto «TOTAL DÓLARES:»' }).click()
  await expect(modo(page).locator('[data-campo-del-retoque="ancho_del_modal"]')).toBeVisible()
  await expect(modo(page).getByRole('textbox', { name: 'Texto de la celda' })).toBeFocused()
  await capturar(page, info, 'retoques-200')
})
