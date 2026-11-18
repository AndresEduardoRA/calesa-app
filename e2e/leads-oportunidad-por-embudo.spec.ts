import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { capturar } from './soporte/recorrido'
import { exigir } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDelLead } from './soporte/leads-marcas'
import {
  embudoPorDefecto,
  etapa,
  irAlEmbudo,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'

// Una oportunidad abierta por embudo: con una abierta en el embudo por defecto, «Crear igual» del aviso va apagado con su motivo y «Abrir esa»
// lleva a la abierta; en el panel de la ficha ese embudo sale apagado y otro deja crear (el embudo elegido llega a la base). El embudo filtrado
// por lead (`?lead=`): sólo las de ese lead con el chip «De <nombre>», «Ver todas» lo quita, cambiar de embudo lo conserva y uno inválido se quita.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Un lead de Berta con una abierta en su embudo por defecto (la base: el título es el nombre).
async function leadConAbierta(corto: string) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await embudoPorDefecto(t.personas.berta)
  const abierta = await oportunidad(t.personas.berta, lead.id, { titulo: lead.nombre })
  return { lead, abierta }
}

// Otro embudo de Berta (por su RPC, como en la app); el mismo intento devuelve el mismo.
async function otroEmbudo(nombre: string): Promise<string> {
  const { data, error } = await rpcComo(t.personas.berta, 'embudo_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre,
  })
  exigir(error, `crear el embudo ${nombre}`)
  return (data as { embudo: { id: string } }).embudo.id
}

async function embudosDe(leadId: string) {
  const { data, error } = await admin()
    .from('oportunidades')
    .select('embudo_id, titulo')
    .eq('lead_id', leadId)
    .returns<{ embudo_id: string; titulo: string }[]>()
  exigir(error, 'leer las oportunidades del lead')
  return data ?? []
}

test('el aviso de «Nueva oportunidad…» apaga «Crear igual» con su motivo y «Abrir esa» abre la abierta', async ({
  page,
}, info) => {
  const { lead, abierta } = await leadConAbierta(`Una Aviso ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page, `?${new URLSearchParams({ q: lead.nombre }).toString()}`)
  const menu = await abrirMenuDelLead(page, lead.nombre)
  await menu.getByRole('menuitem', { name: 'Nueva oportunidad…' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  const crearIgual = dialogo.getByRole('button', { name: 'Crear igual' })
  await expect(crearIgual).toBeDisabled()
  await expect(dialogo.getByText('Ya tiene una abierta en «Ventas».')).toBeVisible()
  await expect(crearIgual).toHaveAccessibleDescription('Ya tiene una abierta en «Ventas».')
  await capturar(page, info, 'aviso-con-una-abierta')
  await dialogo.getByRole('link', { name: 'Abrir esa' }).click()
  await expect(page).toHaveURL(
    new RegExp(
      `/leads/${lead.id}\\?seccion=oportunidades&panel=editar-oportunidad&oportunidad=${abierta.id}`,
    ),
  )
  await expect(page.getByRole('dialog', { name: 'Editar oportunidad' })).toBeVisible()
  expect(await embudosDe(lead.id)).toHaveLength(1)
})

test('el panel de la ficha apaga el embudo con una abierta y crea en el elegido', async ({
  page,
}, info) => {
  const { lead } = await leadConAbierta(`Una Panel ${info.project.name}`)
  const posventa = await otroEmbudo(`Posventa ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades&panel=nueva-oportunidad')
  const panel = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  const embudo = panel.getByLabel('Embudo')
  await expect(embudo).toHaveValue(posventa)
  await expect(
    embudo.getByRole('option', { name: 'Ventas (por defecto) · Ya tiene una abierta' }),
  ).toBeDisabled()
  await capturar(page, info, 'panel-con-el-por-defecto-apagado')
  await panel.getByLabel('Título').fill(`Repuestos ${info.project.name}`)
  await panel.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(panel).toHaveCount(0)
  await expect
    .poll(
      async () =>
        (await embudosDe(lead.id)).find((o) => o.titulo === `Repuestos ${info.project.name}`)
          ?.embudo_id,
    )
    .toBe(posventa)
})

test('el embudo filtrado por lead: sólo las suyas con el chip, «Ver todas» lo quita y cambiar de embudo lo conserva', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  const { lead } = await leadConAbierta(`Una Filtro ${proyecto}`)
  const otro = await leadConAbierta(`Una Otro ${proyecto}`)
  const ventas = await embudoPorDefecto(t.personas.berta)
  const flotas = await otroEmbudo(`Flotas ${proyecto}`)
  await oportunidad(t.personas.berta, lead.id, {
    titulo: `Ganada del filtro ${proyecto}`,
    etapa_id: etapa(ventas, 'Ganado'),
  })
  await oportunidad(t.personas.berta, lead.id, {
    titulo: `En flotas ${proyecto}`,
    embudo_id: flotas,
  })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page, `&embudo=${ventas.id}&lead=${lead.id}`)

  await expect(
    page.getByRole('button', { name: `Quitar el filtro de ${lead.nombre}` }),
  ).toBeVisible()
  await expect(page.getByText('Aquí ves tus oportunidades.')).toHaveCount(0)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, lead.nombre)).toBeVisible()
  await expect(page.getByRole('article', { name: otro.lead.nombre })).toHaveCount(0)
  await capturar(page, info, 'embudo-filtrado-por-lead')
  await verEtapa(page, 'Ganado')
  await expect(tarjeta(page, `Ganada del filtro ${proyecto}`)).toBeVisible()

  // «Ver todas» quita el filtro: vuelven las de los demás leads.
  await page.getByRole('button', { name: 'Ver todas' }).click()
  await expect(page).not.toHaveURL(/[?&]lead=/)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, otro.lead.nombre)).toBeVisible()

  // Cambiar de embudo con el selector conserva el filtro.
  await irAlEmbudo(page, `&embudo=${ventas.id}&lead=${lead.id}`)
  await page.getByRole('button', { name: 'Embudo: Ventas' }).click()
  await page.getByRole('menuitemradio', { name: `Flotas ${proyecto}` }).click()
  // El menú del selector no se cierra solo al elegir (docs/PENDIENTES.md): en el celular taparía las pestañas.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`embudo=${flotas}`))
  await expect(page).toHaveURL(new RegExp(`lead=${lead.id}`))
  await expect(
    page.getByRole('button', { name: `Quitar el filtro de ${lead.nombre}` }),
  ).toBeVisible()
  await verEtapa(page, 'Nueva')
  await expect(tarjeta(page, `En flotas ${proyecto}`)).toBeVisible()
})

test('un `lead=` que no existe o no es un id se ignora y se quita de la URL', async ({ page }) => {
  await entrar(page, t.personas.berta)
  for (const lead of [crypto.randomUUID(), 'no-es-un-id']) {
    await irAlEmbudo(page, `&lead=${lead}`)
    await expect(page).not.toHaveURL(/[?&]lead=/)
    await expect(page.getByRole('button', { name: /^Quitar el filtro de / })).toHaveCount(0)
    await expect(page.getByText('Aquí ves tus oportunidades.')).toBeVisible()
  }
})
