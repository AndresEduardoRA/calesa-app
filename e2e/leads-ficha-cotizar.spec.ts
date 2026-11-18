import { expect, test } from './soporte/prueba'
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
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { cabeceraDeLaFicha, elegirEnElMenuDeLaFicha } from './soporte/leads-ficha'
import { abrirMenuDeLaFicha } from './soporte/leads-marcas'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'

// «Cotizar lead» en la ficha del lead (`docs/UX.md` › «Cotizar»): la primera línea del «⋯» de la cabecera (no hay un botón suelto), que abre la hoja
// con este lead ya elegido, en el primer origen donde quien mira cotiza, y vuelve a la ficha (`returnTo`). Sólo se ofrece si cotiza en algún origen;
// la base vuelve a exigirlo al guardar.
test.describe.configure({ mode: 'serial' })

let asesora = ''
let sinCotizar = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-ficha-cotizar-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dora Ficha',
  })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`ficha-cotizar-${proyecto}`))
  lead = await crearLead({
    nombre: `ficha cotizar ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  // Ve todos los leads y no tiene ningún permiso de cotizaciones.
  sinCotizar = correoDePrueba(`sin-cotizar-ficha-${proyecto}`)
  await crearPersona({
    email: sinCotizar,
    contrasena: CONTRASENA,
    nombre: 'Sara Sin Cotizar',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinCotizar,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sin cotizar ${proyecto}`,
      clave: `e2e_sin_cotizar_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [{ clave: 'leads.ver', alcance: 'todos' }],
  })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E «Cotizar lead» del «⋯» de la ficha abre la hoja con este lead elegido, en el primer origen donde se cotiza', async ({
  page,
}) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/leads/${lead}`)
  // Ningún «Cotizar» ni «Editar» sueltos en la cabecera: viven en el «⋯».
  await expect(cabeceraDeLaFicha(page).getByRole('link')).toHaveCount(0)
  await expect(cabeceraDeLaFicha(page).getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await elegirEnElMenuDeLaFicha(page, 'Cotizar lead', page.locator('[data-hoja]'))
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('lead')).toBe(lead)
  expect(url.searchParams.get('returnTo')).toBe(`/leads/${lead}`)
  await expect(page.getByRole('button', { name: /^Cliente:/ })).toContainText('ficha cotizar')
  // El origen de la URL es la primera pestaña de la hoja.
  const primera = page.getByRole('navigation', { name: 'Orígenes' }).getByRole('link').first()
  await expect(primera).toHaveAttribute('aria-current', 'page')
  expect(url.searchParams.get('origen')).not.toBeNull()
})

test('E2E sin ningún permiso de cotizaciones el «⋯» no ofrece «Cotizar lead» y la ficha se ve igual', async ({
  page,
}, info) => {
  await entrar(page, sinCotizar, { fresco: true })
  await page.goto(`/leads/${lead}`)
  await expect(
    page.getByRole('heading', { name: `E2E ficha cotizar ${info.project.name}`, level: 1 }),
  ).toBeVisible()
  const menu = await abrirMenuDeLaFicha(page)
  await expect(menu.getByRole('menuitem').first()).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Cotizar lead' })).toHaveCount(0)
})
