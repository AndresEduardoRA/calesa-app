import {
  abrirNuevo,
  botonNuevoDeLaBarra,
  CONTRASENA,
  dialogo,
  entrar,
  modalDeNuevo,
} from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { nacional } from './soporte/leads-ficha-telefonos'
import { capturar } from './soporte/recorrido'
import { expect, test, type Locator, type Page } from './soporte/prueba'

// «Nuevo» de la barra superior (`docs/UX.md` › «Barra superior»): el modal lista lo que cada rol puede crear, abre con «Lead» enfocado, `Shift+N` lo abre
// y cada opción abre su puerta. Seguimiento y recordatorio piden elegir antes un lead de la cartera.
let personas: Record<'duena' | 'asesora' | 'logistica' | 'repuestos' | 'cotizador', string>
let leadId = ''
const LEAD = 'Nuevo Alfa Boton'

const ROLES: Record<Exclude<keyof typeof personas, 'duena'>, PermisoDePrueba[]> = {
  asesora: [
    'leads.crear',
    { clave: 'leads.ver', alcance: 'propios' },
    { clave: 'leads.editar', alcance: 'propios' },
    'cotizaciones.ver',
    'cotizaciones.crear',
  ],
  logistica: ['logistica.ver', 'vehiculos.ver'],
  repuestos: ['repuestos.ver', 'repuestos.editar'],
  // Sólo da de alta vehículos desde la hoja de cotizar.
  cotizador: [
    'cotizaciones.ver',
    'cotizaciones.crear',
    'vehiculos.ver',
    'vehiculos.crear.desde_cotizar',
  ],
}

test.beforeAll(async ({}, info) => {
  const p = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  personas = {
    duena: correoDePrueba(`duena-nuevo-${p}`),
    asesora: correoDePrueba(`asesora-nuevo-${p}`),
    logistica: correoDePrueba(`logistica-nuevo-${p}`),
    repuestos: correoDePrueba(`repuestos-nuevo-${p}`),
    cotizador: correoDePrueba(`cotizador-nuevo-${p}`),
  }
  await crearDuenaDePrueba({ email: personas.duena, contrasena: CONTRASENA, nombre: 'Dalia Nuevo' })
  await Promise.all(
    (Object.keys(ROLES) as (keyof typeof ROLES)[]).map(async (rol) => {
      await crearPersona({
        email: personas[rol],
        contrasena: CONTRASENA,
        nombre: `Persona ${rol} Nuevo`,
        invitada: true,
      })
      await darRolDePrueba({
        email: personas[rol],
        rol: {
          nombre: `${PREFIJO_ROL_E2E}Nuevo ${rol} ${p}`,
          clave: `e2e_nuevo_${rol}_${p.replaceAll(/[^a-z0-9]/g, '_')}`,
        },
        permisos: ROLES[rol],
      })
    }),
  )
  leadId = await crearLead({ nombre: LEAD, telefono: nacional(), deQuien: personas.asesora })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// El segundo paso cambia el título del mismo modal.
const pasoDelLead = (page: Page): Locator =>
  page.getByRole('dialog', { name: /^(Anotar seguimiento|Agendar recordatorio)$/ })

const opciones = (page: Page): Locator =>
  modalDeNuevo(page).getByRole('list', { name: 'Qué crear' })

async function titulos(page: Page): Promise<string[]> {
  const nombres = await opciones(page)
    .getByRole('listitem')
    .locator('button > span > span:first-child')
    .allTextContents()
  return nombres
}

test('la dueña ve todo lo que se puede crear, con «Lead» enfocado, y Enter abre el alta', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  await abrirNuevo(page)
  expect(await titulos(page)).toEqual([
    'Lead',
    'Vehículo',
    'Cotización',
    'Proyecto de repuestos',
    'Seguimiento',
    'Recordatorio',
    'Evento',
    'Tarea',
  ])
  await expect(opciones(page).getByRole('button', { name: /^Lead/ })).toBeFocused()
  await capturar(page, info, 'nuevo-modal-duena')
  await page.keyboard.press('Enter')
  await expect(dialogo(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=nuevo-lead/)
  await expect(modalDeNuevo(page)).toBeHidden()
  await expect(dialogo(page).getByLabel('Teléfono principal')).toBeFocused({ timeout: 10_000 })
})

test('Shift+N abre «Nuevo» desde cualquier pantalla y Esc lo cierra; no abre encima de otro diálogo', async ({
  page,
}) => {
  test.skip(test.info().project.name === 'movil', 'La tecla es del teclado físico.')
  await entrar(page, personas.duena)
  await page.goto('/vehiculos')
  await expect(async () => {
    await page.keyboard.press('Shift+N')
    await expect(modalDeNuevo(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Escape')
  await expect(modalDeNuevo(page)).toBeHidden()
  // Con el alta abierta, Mayús+N no hace nada (y no se pisa lo escrito).
  await page.goto('/vehiculos?panel=nuevo-lead')
  await expect(dialogo(page)).toBeVisible()
  await expect(dialogo(page).getByLabel('Teléfono principal')).toBeFocused({ timeout: 10_000 })
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.keyboard.press('Shift+N')
  await expect(modalDeNuevo(page)).toHaveCount(0)
})

test('la asesora ve lo suyo: sin vehículo suelto ni proyecto; con seguimiento y recordatorio', async ({
  page,
}) => {
  await entrar(page, personas.asesora)
  await abrirNuevo(page)
  expect(await titulos(page)).toEqual([
    'Lead',
    'Cotización',
    'Seguimiento',
    'Recordatorio',
    'Evento',
    'Tarea',
  ])
})

test('logística sólo ve lo propio de la agenda y repuestos suma su proyecto', async ({ page }) => {
  await entrar(page, personas.logistica)
  await abrirNuevo(page)
  expect(await titulos(page)).toEqual(['Evento', 'Tarea'])
  await expect(opciones(page).getByRole('button', { name: /^Evento/ })).toBeFocused()
})

test('repuestos: «Proyecto de repuestos» abre el panel de la pantalla de repuestos', async ({
  page,
}) => {
  await entrar(page, personas.repuestos)
  await abrirNuevo(page)
  expect(await titulos(page)).toEqual(['Proyecto de repuestos', 'Evento', 'Tarea'])
  await opciones(page)
    .getByRole('button', { name: /^Proyecto/ })
    .click()
  await expect(page).toHaveURL(/\/repuestos\?panel=nuevo-proyecto/)
  await expect(page.getByRole('dialog', { name: 'Nuevo proyecto' })).toBeVisible()
  await expect(modalDeNuevo(page)).toBeHidden()
})

test('con sólo el alta de vehículos desde la hoja, «Vehículo» abre la hoja de cotizar con el vehículo en alta', async ({
  page,
}) => {
  await entrar(page, personas.cotizador)
  await abrirNuevo(page)
  expect(await titulos(page)).toEqual(['Vehículo', 'Cotización', 'Evento', 'Tarea'])
  await opciones(page)
    .getByRole('button', { name: /^Vehículo/ })
    .click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?.*panel=vehiculo/)
  await expect(page).toHaveURL(/alta=mano/)
})

test('Evento y Cotización llevan a su pantalla y se cierra el modal', async ({ page }) => {
  await entrar(page, personas.asesora)
  await abrirNuevo(page)
  await opciones(page)
    .getByRole('button', { name: /^Evento/ })
    .click()
  await expect(page).toHaveURL(/\/agenda\?panel=nuevo-evento/)
  await expect(page.getByRole('dialog', { name: 'Nuevo evento' })).toBeVisible()
  await page.goto('/')
  await abrirNuevo(page)
  await opciones(page)
    .getByRole('button', { name: /^Cotización/ })
    .click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo/)
  await expect(modalDeNuevo(page)).toBeHidden()
})

test('«Seguimiento» pide el lead de la cartera y abre su modal en la ficha', async ({
  page,
}, info) => {
  await entrar(page, personas.asesora)
  await abrirNuevo(page)
  await opciones(page)
    .getByRole('button', { name: /^Seguimiento/ })
    .click()
  const paso = pasoDelLead(page)
  await expect(paso.getByText('¿A cuál de tus leads?')).toBeVisible()
  const campo = paso.getByLabel('Lead', { exact: true })
  await expect(campo).toBeFocused()
  // Bajo el mínimo no se pide nada; un teléfono tampoco; sin coincidencias, lo dice.
  await campo.fill('ab')
  await expect(paso.getByText('Escribe al menos 3 letras')).toBeVisible()
  await campo.fill('+54 911 5555 0000')
  await expect(paso.getByText('No se busca por teléfono')).toBeVisible()
  await campo.fill('zzzzzzz')
  await expect(paso.getByText(/No encontramos leads tuyos/)).toBeVisible()
  await capturar(page, info, 'nuevo-paso-sin-resultados')
  // «Atrás» vuelve a la lista y se puede volver a entrar.
  await paso.getByRole('button', { name: 'Atrás' }).click()
  await expect(opciones(page)).toBeVisible()
  await opciones(page)
    .getByRole('button', { name: /^Seguimiento/ })
    .click()
  await pasoDelLead(page).getByLabel('Lead', { exact: true }).fill('Alfa Boton')
  await expect(pasoDelLead(page).getByRole('button', { name: new RegExp(LEAD) })).toBeVisible()
  await capturar(page, info, 'nuevo-paso-con-resultado')
  await pasoDelLead(page)
    .getByRole('button', { name: new RegExp(LEAD) })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/leads/${leadId}\\?seccion=seguimientos&panel=anotar-seguimiento`),
  )
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeVisible()
})

test('«Recordatorio»: Enter elige el único resultado y abre el modal de agendar', async ({
  page,
}) => {
  await entrar(page, personas.asesora)
  await abrirNuevo(page)
  await opciones(page)
    .getByRole('button', { name: /^Recordatorio/ })
    .click()
  const campo = pasoDelLead(page).getByLabel('Lead', { exact: true })
  await campo.fill('Alfa Boton')
  await expect(pasoDelLead(page).getByRole('button', { name: new RegExp(LEAD) })).toBeVisible()
  await campo.press('Enter')
  await expect(page).toHaveURL(/panel=agendar-recordatorio/)
  await expect(page.getByRole('dialog', { name: 'Agendar recordatorio' })).toBeVisible()
})

test('sin conexión el paso del lead lo dice y «Reintentar» vuelve a pedir', async ({ page }) => {
  await entrar(page, personas.asesora)
  await abrirNuevo(page)
  await opciones(page)
    .getByRole('button', { name: /^Seguimiento/ })
    .click()
  await page.route('**/rest/v1/rpc/buscador_leads', (ruta) => ruta.abort('failed'))
  await pasoDelLead(page).getByLabel('Lead', { exact: true }).fill('Alfa Boton')
  const reintentar = pasoDelLead(page).getByRole('button', { name: 'Reintentar' })
  await expect(reintentar).toBeVisible()
  await page.unroute('**/rest/v1/rpc/buscador_leads')
  await reintentar.click()
  await expect(pasoDelLead(page).getByRole('button', { name: new RegExp(LEAD) })).toBeVisible()
})

test('«Nuevo» está en la barra con su nombre y se puede abrir por URL (recargar lo reabre)', async ({
  page,
}) => {
  await entrar(page, personas.asesora)
  await expect(botonNuevoDeLaBarra(page)).toBeVisible()
  await abrirNuevo(page)
  await expect(page).toHaveURL(/panel=crear/)
  await page.reload()
  await expect(modalDeNuevo(page)).toBeVisible()
  await page.goBack()
  await expect(modalDeNuevo(page)).toBeHidden()
})
