import { expect, test, type Page } from './soporte/prueba'
import { escribirElTitulo } from './soporte/cotizar-titulo'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { crearLead } from './soporte/leads'
import { capturar } from './soporte/recorrido'
import { telefonoAlAzar } from './soporte/leads-alta'
import { darRolDeLaSemilla } from './soporte/rol-de-la-semilla'
import { literal, sql } from './soporte/sql'

// Vehículo y lead obligatorios al cotizar, por rol y por origen (T10, `docs/UX.md` › «Cotizar»): sin `cotizaciones.crear.sin_vehiculo` ni `cotizaciones.crear.sin_lead` del origen la hoja
// no guarda, dice qué falta, marca la barra con «Obligatorio» y lleva a elegirlo; con ellas guarda sin nada. Ningún spec toca el rol dueño (lo comparten los workers): los roles son «E2E …».
test.describe.configure({ mode: 'serial' })

const CLIENTE = 'Para guardar, elige el cliente en «Cliente».'
const VEHICULO = 'Para guardar, elige el vehículo en «Vehículo».'
const BASE = ['cotizaciones.crear', 'cotizaciones.ver', 'leads.ver', 'vehiculos.ver']

let proyecto = ''
let origenA = { id: '', nombre: '' }
let origenB = { id: '', nombre: '' }
let duena = ''
const NOMBRE_DE_LA_DUENA = 'Gala Guarda'
let asesora = ''
let leadDeLaAsesora = ''
let vehiculo = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen: origenA, duena } = await prepararGuardado(proyecto, 'vinculos'))
  origenB = await crearOrigenDeCotizar(proyecto, 'vincb', true)
  asesora = correoDePrueba(`asesora-vinculos-${proyecto}`)
  await crearPersona({
    email: asesora,
    contrasena: CONTRASENA,
    nombre: 'Ana Asesora',
    invitada: true,
  })
  await darRolDeLaSemilla(asesora, 'asesor')
  leadDeLaAsesora = await crearLead({
    nombre: `vinculos ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origenA.id)}::uuid, ${literal(`E2E vínculos ${proyecto}`)})`,
  )
  vehiculo = sql(
    `select id from public.vehiculos where origen_id = ${literal(origenA.id)}::uuid and titulo = ${literal(`E2E vínculos ${proyecto}`)}`,
  )
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar', exact: true })

// Una persona con un rol «E2E …» que cotiza en todos los orígenes y tiene las claves dadas (cada una en un origen o en ninguno).
async function personaConClaves(
  etiqueta: string,
  claves: { clave: string; origenId?: string }[],
): Promise<string> {
  const email = correoDePrueba(`${etiqueta}-vinculos-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre: `Pablo ${etiqueta}`, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} ${proyecto}`,
      clave: `e2e_${etiqueta}_${proyecto}`,
    },
    permisos: [...BASE, ...claves],
  })
  return email
}

test('E2E el Asesor de la semilla no guarda sin cliente ni vehículo: lo dice, marca «Obligatorio» y lleva a elegirlos', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}`)
  await expect(guardar(page)).toBeDisabled()
  await expect(page.getByText(CLIENTE)).toBeVisible()
  await expect(page.getByText('Obligatorio', { exact: true })).toHaveCount(2)
  await capturar(page, info, 'sin-cliente-ni-vehiculo')
  await page.getByRole('button', { name: 'Elegir el cliente' }).click()
  await expect(page).toHaveURL(/panel=cliente/)
  const panelDelCliente = page.getByRole('dialog', { name: 'Cliente', exact: true })
  await expect(panelDelCliente).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panelDelCliente).toBeHidden()

  // Con el cliente y sin vehículo: el vehículo falta, y «Elegir el vehículo» abre su panel.
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}&lead=${leadDeLaAsesora}`)
  await expect(guardar(page)).toBeDisabled()
  await expect(page.getByText(VEHICULO)).toBeVisible()
  await expect(page.getByText('Obligatorio', { exact: true })).toHaveCount(1)
  await capturar(page, info, 'falta-el-vehiculo')
  await page.getByRole('button', { name: 'Elegir el vehículo' }).click()
  await expect(page).toHaveURL(/panel=vehiculo/)
  const panelDelVehiculo = page.getByRole('dialog', { name: 'Vehículo', exact: true })
  await expect(panelDelVehiculo).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panelDelVehiculo).toBeHidden()

  // Con los dos: guarda.
  await page.goto(
    `/cotizaciones/nuevo?origen=${origenA.id}&lead=${leadDeLaAsesora}&vehiculo=${vehiculo}`,
  )
  await expect(page.getByText('Obligatorio', { exact: true })).toHaveCount(0)
  await tipearEnLaHoja(page, 'pub', '10')
  await expect(guardar(page)).toBeEnabled()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  expect(guardados.pedidos[0]?.leadId).toBe(leadDeLaAsesora)
})

test('E2E la dueña (tiene las dos claves) guarda sin cliente ni vehículo, y en la base quedan nulos', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}`)
  await expect(page.getByText('Obligatorio', { exact: true })).toHaveCount(0)
  // Sin vehículo, el título es obligatorio para cualquier rol (T307).
  await escribirElTitulo(page)
  await tipearEnLaHoja(page, 'pub', '10')
  await expect(guardar(page)).toBeEnabled()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const intento = guardados.pedidos[0]?.intento ?? ''
  expect(guardados.pedidos[0]?.leadId).toBeNull()
  expect(
    sql(
      `select coalesce(lead_id::text, '-') || '|' || coalesce(vehiculo_id::text, '-') from public.cotizaciones where id = ${literal(intento)}::uuid`,
    ),
  ).toBe('-|-')
})

test('E2E un rol con las dos claves sólo en el origen A guarda sin nada en A; en B pide el cliente', async ({
  page,
}) => {
  const persona = await personaConClaves('soloa', [
    { clave: 'cotizaciones.crear.sin_lead', origenId: origenA.id },
    { clave: 'cotizaciones.crear.sin_vehiculo', origenId: origenA.id },
  ])
  const guardados = await vigilarGuardados(page)
  await entrar(page, persona, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}`)
  // Sin vehículo, el título es obligatorio para cualquier rol (T307).
  await escribirElTitulo(page)
  await tipearEnLaHoja(page, 'pub', '10')
  await expect(guardar(page)).toBeEnabled()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)

  // El otro origen: la misma persona, otra regla.
  await page.goto(`/cotizaciones/nuevo?origen=${origenB.id}`)
  await expect(guardar(page)).toBeDisabled()
  await expect(page.getByText(CLIENTE)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Elegir el cliente' })).toBeVisible()
})

test('E2E «Ver como» el Asesor desde la dueña: la hoja pide el cliente', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}`)
  await expect(page.getByText(CLIENTE)).toHaveCount(0)
  const verComo = async (rol: string) => {
    await page.getByRole('button', { name: `Menú de ${NOMBRE_DE_LA_DUENA}` }).click()
    const opcion = page.getByRole('menuitemradio', { name: rol })
    await opcion.click()
    await expect(opcion).toBeChecked()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
  }
  await verComo('Asesor')
  try {
    await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}`)
    await expect(page.getByText(CLIENTE)).toBeVisible()
    await expect(guardar(page)).toBeDisabled()
  } finally {
    await verComo('Yo, con mis permisos')
  }
})

test('E2E la regla cambió con la hoja abierta: el rechazo lo dice y ofrece elegir el cliente', async ({
  page,
}, info) => {
  const persona = await personaConClaves('cambia', [
    { clave: 'cotizaciones.crear.sin_lead', origenId: origenA.id },
  ])
  const guardados = await vigilarGuardados(page)
  await entrar(page, persona, { fresco: true })
  // Con el vehículo en la URL (la clave del vehículo no la tiene) y sin cliente: se puede guardar mientras tenga la clave del lead.
  await page.goto(`/cotizaciones/nuevo?origen=${origenA.id}&vehiculo=${vehiculo}`)
  await tipearEnLaHoja(page, 'pub', '10')
  await expect(guardar(page)).toBeEnabled()
  // Se la quitan con la hoja abierta.
  sql(
    `delete from public.roles_permisos where permiso_clave = 'cotizaciones.crear.sin_lead' and rol_id = (select id from public.roles where clave = ${literal(`e2e_cambia_${proyecto}`)})`,
  )
  await guardar(page).click()
  await expect(
    page.getByText('Tu rol ahora pide el cliente para guardar en este origen.'),
  ).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  await capturar(page, info, 'la-regla-cambio')
  await page.getByRole('button', { name: 'Elegir el cliente' }).first().click()
  await expect(page).toHaveURL(/panel=cliente/)
})
