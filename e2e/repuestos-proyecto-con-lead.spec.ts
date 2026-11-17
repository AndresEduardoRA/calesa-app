import {
  CONTRASENA,
  dialogo as dialogoDelAlta,
  entrar,
  limpiarAlta,
  prepararAlta,
  type PersonasDelAlta,
} from './soporte/alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './soporte/base'
import { telefonoAlAzar } from './soporte/leads-alta'
import { expect, test, type Page } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El cliente de un proyecto de repuestos como lead (T35): la cabecera de `/repuestos/<id>` muestra el lead (enlazado, con sus números y «Fuera de tu cartera»), «Cliente que
// no puedes ver» a quien no lo ve, y un proyecto viejo con cliente y teléfono escritos a mano se ve igual (sin el teléfono). En «Nuevo proyecto», «De un vehículo» trae el lead
// vinculado al vehículo y «Nuevo lead» (el alta del shell) vuelve al formulario con lo escrito y el creado elegido. Lo que siembra lleva «E2E Con lead» y se limpia.
test.describe.configure({ mode: 'serial' })

const PREFIJO = 'E2E Con lead'
const VIEJO = `${PREFIJO} viejo`
const AJENO = `${PREFIJO} ajeno`
const LEAD_AJENO = `${PREFIJO} Ana Ajena`
const CLIENTE_VIEJO = `${PREFIJO} Taller Los Pinos`
const TELEFONO_VIEJO = '70011223'

let personas: PersonasDelAlta
let restaurar = async () => {}
let lectora = ''

function limpiar(): void {
  const como = literal(`${PREFIJO}%`)
  sql(`
    delete from public.repuestos_proyectos
      where vehiculo_etiqueta like ${como}
         or vehiculo_id in (select id from public.vehiculos where titulo like ${como})
         or lead_id in (select id from public.leads where nombre like ${como});
    delete from public.vehiculos where titulo like ${como};
    delete from public.leads where nombre like ${como};`)
}

// Un lead en la cartera de `correo` (su dueña), sembrado por SQL.
function sembrarLead(nombre: string, correo: string): string {
  return sql(`
    with p as (select id from public.perfiles where email = ${literal(correo)}),
         l as (insert into public.leads (nombre, telefono_principal, creado_por)
               select ${literal(nombre)}, ${literal(telefonoAlAzar())}, p.id from p returning id, creado_por),
         a as (insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
               select id, creado_por, 'dueno' from l returning lead_id)
    select lead_id from a`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  const terreno = await prepararAlta(`${proyecto}-rep-lead`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  lectora = correoDePrueba(`lectora-rep-lead-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lía Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos con lead ${proyecto}`,
      clave: `e2e_ve_rep_lead_${proyecto}`,
    },
    permisos: ['repuestos.ver'],
  })
  limpiar()
})

test.afterAll(async () => {
  limpiar()
  await limpiarAlta(restaurar)
})

test('un proyecto viejo con cliente y teléfono escritos a mano se ve igual, sin el teléfono', async ({
  page,
}) => {
  const id = sql(`
    insert into public.repuestos_proyectos (vehiculo_etiqueta, cliente_nombre, cliente_telefono)
    values (${literal(VIEJO)}, ${literal(CLIENTE_VIEJO)}, ${literal(TELEFONO_VIEJO)}) returning id`)
  await entrar(page, personas.duena, { fresco: true })
  await page.goto(`/repuestos?q=${encodeURIComponent(VIEJO)}`)
  const principal = page.getByRole('main')
  await expect(principal.getByText(`Externo · ${VIEJO}`)).toBeVisible()
  await expect(principal.getByText(CLIENTE_VIEJO)).toBeVisible()

  await page.goto(`/repuestos/${id}`)
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()
  await expect(principal.getByText(CLIENTE_VIEJO, { exact: true })).toBeVisible()
  await expect(principal.getByRole('link', { name: CLIENTE_VIEJO })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(TELEFONO_VIEJO)
})

test('la cabecera enlaza el lead de otra cartera con sus números; quien no ve leads ve «Cliente que no puedes ver»', async ({
  page,
  context,
}, info) => {
  const lead = sembrarLead(LEAD_AJENO, personas.berta)
  const id = sql(`
    insert into public.repuestos_proyectos (vehiculo_etiqueta, lead_id)
    values (${literal(AJENO)}, ${literal(lead)}::uuid) returning id`)
  await entrar(page, personas.duena, { fresco: true })
  await page.goto(`/repuestos/${id}`)
  const principal = page.getByRole('main')
  const enlace = principal.getByRole('link', { name: LEAD_AJENO })
  await expect(enlace).toBeVisible()
  await expect(enlace).toHaveAttribute('href', `/leads/${lead}`)
  await expect(principal.locator('[data-numero="principal"]')).toHaveText(/^N\.º /)
  await expect(principal.getByText('Fuera de tu cartera')).toBeVisible()
  await capturar(page, info, 'cabecera-con-lead')

  await context.clearCookies()
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${id}`)
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()
  await expect(principal.getByText('Cliente que no puedes ver')).toBeVisible()
  await expect(principal.getByText(LEAD_AJENO)).toHaveCount(0)
  await expect(principal.getByRole('link', { name: LEAD_AJENO })).toHaveCount(0)
})

const formulario = (page: Page) => page.getByRole('dialog', { name: 'Nuevo proyecto' })

async function abrirElFormulario(page: Page): Promise<void> {
  await entrar(page, personas.duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  await expect(formulario(page)).toBeVisible()
}

async function crearYEsperarLaCabecera(page: Page): Promise<void> {
  await formulario(page).getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(formulario(page)).toBeHidden()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()
}

test('«De un vehículo» trae el lead vinculado al vehículo y el proyecto nace con él', async ({
  page,
}, info) => {
  const titulo = `${PREFIJO} Hilux ${info.project.name}`
  const nombre = `${PREFIJO} Vinculada ${info.project.name}`
  const lead = sembrarLead(nombre, personas.duena)
  const origen = sql("select id from public.origenes where clave = 'subasta_usa'")
  const vehiculo = sql(`
    insert into public.vehiculos (origen_id, titulo) values (${literal(origen)}::uuid, ${literal(titulo)}) returning id`)
  sql(
    `update public.vehiculos set lead_id = ${literal(lead)}::uuid where id = ${literal(vehiculo)}::uuid`,
  )

  await abrirElFormulario(page)
  await formulario(page).getByRole('radio', { name: 'De un vehículo' }).check()
  await formulario(page).getByRole('combobox', { name: 'Vehículo' }).fill(titulo)
  await formulario(page).getByRole('option', { name: titulo }).click()
  const cliente = formulario(page).locator('[data-elegido]').filter({ hasText: nombre })
  await expect(cliente).toBeVisible()
  await expect(formulario(page).getByText('Vinculado al vehículo')).toBeVisible()
  await capturar(page, info, 'formulario-con-el-lead-del-vehiculo')

  await crearYEsperarLaCabecera(page)
  await expect(page.getByRole('main').getByRole('link', { name: nombre })).toHaveAttribute(
    'href',
    `/leads/${lead}`,
  )
  expect(
    sql(
      `select lead_id from public.repuestos_proyectos where vehiculo_id = ${literal(vehiculo)}::uuid`,
    ),
  ).toBe(lead)
})

test('«Externo» con «Nuevo lead»: Esc vuelve con lo escrito; guardar el lead lo deja elegido y el proyecto nace con él', async ({
  page,
}, info) => {
  const etiqueta = `${PREFIJO} externo ${info.project.name}`
  const nombre = `${PREFIJO} Creada ${info.project.name}`
  await abrirElFormulario(page)
  await formulario(page).getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  const nuevoLead = formulario(page).getByRole('button', { name: 'Nuevo lead' })

  // Esc cierra el alta y vuelve el formulario con lo escrito.
  await nuevoLead.click()
  const alta = dialogoDelAlta(page)
  await expect(alta).toBeVisible()
  await expect(alta.getByLabel('Teléfono principal')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(alta).toBeHidden()
  await expect(formulario(page)).toBeVisible()
  await expect(formulario(page).getByLabel('Vehículo', { exact: true })).toHaveValue(etiqueta)

  // Con el alta encima, el formulario sigue en la URL por su clave propia y no está a la vista.
  await nuevoLead.click()
  await expect(alta).toBeVisible()
  await expect(formulario(page)).toBeHidden()
  const url = new URL(page.url())
  expect(url.searchParams.get('panel')).toBe('nuevo-lead')
  expect(url.searchParams.get('elegir')).toBe('lead')
  expect(url.searchParams.get('nuevo')).toBe('proyecto')
  await capturar(page, info, 'alta-sobre-el-formulario')
  await alta.getByLabel('Teléfono principal').fill(telefonoAlAzar())
  await alta.getByLabel('Nombre').fill(nombre)
  await alta.getByRole('button', { name: 'Guardar lead' }).click()
  await expect
    .poll(() => sql(`select id from public.leads where nombre = ${literal(nombre)}`))
    .not.toBe('')
  const creado = sql(`select id from public.leads where nombre = ${literal(nombre)}`)

  // Vuelve el formulario con lo escrito y el lead creado elegido; la URL ya no lleva el lead ni el alta.
  await expect(alta).toBeHidden()
  await expect(formulario(page)).toBeVisible()
  await expect(formulario(page).getByLabel('Vehículo', { exact: true })).toHaveValue(etiqueta)
  await expect(formulario(page).locator('[data-elegido]')).toContainText(
    nombre.replace(/^E2E /, ''),
  )
  await expect
    .poll(() => {
      const vuelta = new URL(page.url()).searchParams
      return [vuelta.get('lead'), vuelta.get('panel'), vuelta.get('elegir')]
    })
    .toEqual([null, null, null])
  await capturar(page, info, 'formulario-con-el-lead-creado')

  await crearYEsperarLaCabecera(page)
  await expect(
    page.getByRole('main').getByRole('link', { name: nombre.replace(/^E2E /, '') }),
  ).toHaveAttribute('href', `/leads/${creado}`)
  await capturar(page, info, 'cabecera-con-el-lead-creado')
  expect(
    sql(
      `select lead_id from public.repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`,
    ),
  ).toBe(creado)
})
