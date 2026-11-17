import { CONTRASENA, entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './soporte/base'
import { telefonoAlAzar } from './soporte/leads-alta'
import { expect, test } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El cliente de un proyecto de repuestos como lead (T35): la cabecera de `/repuestos/<id>` muestra el lead (enlazado, con sus números y «Fuera de tu cartera»), «Cliente que
// no puedes ver» a quien no lo ve, y un proyecto viejo con cliente y teléfono escritos a mano se ve igual (sin el teléfono). Lo que siembra lleva «E2E Con lead» y se limpia.
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
