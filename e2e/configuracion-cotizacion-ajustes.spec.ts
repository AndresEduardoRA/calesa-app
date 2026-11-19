// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { sql } from './soporte/sql'

// La pestaña «Ajustes» de Configuración › Cotización (4.20-4b, `docs/UX.md` › «Cotización: vigencia (estados propios)»): la vigencia (si el vehículo y el lead son
// obligatorios se decide por rol y origen en «Roles y permisos»; la línea de abajo lleva allí). La ve quien tiene `cotizaciones.configurar` en algún origen y la cambia quien la tiene en todos. El conflicto de versión lo prueba la T3 de
// `supabase/tests/empresa-ajustes-de-cotizacion.sql`. La fila es única: se restaura al final (el e2e corre con un solo worker).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let antes = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  antes = sql('select vigencia_dias from public.ajustes_empresa')
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ajustes-cot-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Vigencia' })
  configuradora = correoDePrueba(`configura-ajustes-cot-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Uma Unorigen',
    invitada: true,
  })
  const origenId = sql('select id from public.origenes order by clave limit 1')
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Configura un origen ${proyecto}`,
      clave: `e2e_configura_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId }],
  })
})

test.afterAll(async () => {
  if (antes !== '') {
    sql(`update public.ajustes_empresa set vigencia_dias = ${Number(antes)}`)
  }
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const vigencia = (page: Page) => page.getByLabel('Vigencia (días)')

test('la dueña cambia la vigencia desde el hub y queda guardada; la línea de «Roles y permisos» la lleva allí', async ({
  page,
}) => {
  sql('update public.ajustes_empresa set vigencia_dias = 15')
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion')
  await page.getByRole('link', { name: /Cotización/ }).click()
  await page
    .getByRole('list', { name: 'Partes generales' })
    .getByRole('link', { name: /Vigencia/ })
    .click()
  await expect(page).toHaveURL(/\/configuracion\/cotizacion\/general\/vigencia$/)
  await expect(page.getByRole('tab', { name: 'Vigencia' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Vigencia', level: 1 })).toBeVisible()
  await expect(vigencia(page)).toHaveValue('15')
  await expect(
    page.getByText(
      'Si una cotización pide vehículo y lead se decide por rol y origen en «Roles y permisos».',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a Roles y permisos' })).toHaveAttribute(
    'href',
    '/configuracion/roles',
  )

  // La barra aparece al cambiar el campo; descartar vuelve a lo guardado y la esconde.
  await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
  await vigencia(page).fill('20')
  await expect(page.getByText('Tienes cambios sin guardar', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Descartar' }).click()
  await expect(vigencia(page)).toHaveValue('15')
  await expect(page.getByText('Tienes cambios sin guardar', { exact: true })).toBeHidden()

  // Con cambios, cambiar de pestaña pregunta.
  await vigencia(page).fill('30')
  await page.getByRole('tab', { name: 'Colores' }).click()
  await page.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(page).toHaveURL(/general\/vigencia$/)
  await expect(vigencia(page)).toHaveValue('30')

  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Vigencia guardada')).toBeVisible()
  expect(sql('select vigencia_dias from public.ajustes_empresa')).toBe('30')

  await page.reload()
  await expect(vigencia(page)).toHaveValue('30')
})

test('quien configura un solo origen ve la vigencia apagada, con el motivo y sin barra', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  // El enlace de antes lleva a General › Vigencia.
  await page.goto('/configuracion/cotizacion?seccion=ajustes')
  await expect(page).toHaveURL(/\/configuracion\/cotizacion\/general\/vigencia$/)
  await expect(page.getByRole('heading', { name: 'Vigencia', level: 1 })).toBeVisible()
  await expect(
    page.getByText('Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.'),
  ).toBeVisible()
  await expect(vigencia(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})
