import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { type irALeads } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { abrirMenuDelLead } from './soporte/leads-marcas'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  modalDeRecordatorio,
  modalDeSeguimiento,
  recordatoriosEnLaBase,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'

// El resumen del listado (`?lead=<id>`) es la versión corta de la ficha, sin pestañas: lo último que pasó sale de la fila (ninguna lectura
// de seguimientos ni de recordatorios), anotar y agendar abren su modal desde el «⋯» dentro del drawer (Esc y «atrás» cierran sólo el modal;
// al guardar, el resumen y la fila lo muestran), sin la cartera no se ofrecen, y `?pestana=` de antes lleva a la ficha en su bloque.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function leadDeBerta(corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })
}

type Pagina = Parameters<typeof irALeads>[0]

const drawerDe = (page: Pagina, nombre: string) => page.getByRole('dialog', { name: nombre })

// Entrar con el drawer ya abierto: el título de la lista queda detrás del drawer (no se espera ese).
async function irAlDrawer(page: Pagina, consulta: string, nombre: string) {
  await page.goto(`/leads${consulta}`)
  await expect(drawerDe(page, nombre)).toBeVisible()
}

// El «⋯» del resumen (no el de la fila de atrás: con el drawer abierto, la lista sale del árbol de accesibilidad).
async function desdeElMenu(page: Pagina, nombre: string, opcion: string) {
  const menu = await abrirMenuDelLead(page, nombre)
  await menu.getByRole('menuitem', { name: opcion }).click()
}

test('sin pestañas: lo último que pasó sale de la fila, sin leer seguimientos ni recordatorios', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Corto ${info.project.name}`)
  await entrar(page, t.personas.berta)
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    const ruta = new URL(pedido.url()).pathname
    if (ruta.endsWith('/rpc/lead_seguimientos') || ruta.endsWith('/rpc/lead_recordatorios')) {
      lecturas.push(ruta)
    }
  })
  await irAlDrawer(page, `?lead=${lead.id}`, lead.nombre)
  const drawer = drawerDe(page, lead.nombre)
  await expect(drawer.getByRole('tablist')).toHaveCount(0)
  await expect(drawer.getByText('Sin seguimientos', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('img', { name: 'Sin recordatorio' })).toBeVisible()
  await expect(drawer.getByText('Teléfono', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Origen del lead', { exact: true })).toBeVisible()
  // Ni los campos del layout ni el alta: son de la ficha.
  await expect(drawer.getByText('Creado', { exact: true })).toHaveCount(0)
  expect(lecturas).toEqual([])
})

test('anotar desde el «⋯» del resumen: el modal va adentro, Esc y «atrás» cierran sólo el modal, y al guardar se ve', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Anotar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, `?lead=${lead.id}`, lead.nombre)
  const drawer = drawerDe(page, lead.nombre)
  const modal = modalDeSeguimiento(page, 'Anotar')

  await desdeElMenu(page, lead.nombre, 'Anotar seguimiento…')
  await expect(modal.getByLabel('Resumen')).toBeFocused()
  await expect(page).toHaveURL(new RegExp(`lead=${lead.id}.*panel=anotar-seguimiento`))
  await expect(page).not.toHaveURL(/para=/)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(drawer).toBeVisible()

  await desdeElMenu(page, lead.nombre, 'Anotar seguimiento…')
  await expect(modal.getByLabel('Resumen')).toBeFocused()
  await page.goBack()
  await expect(modal).toHaveCount(0)
  await expect(drawer).toBeVisible()

  await desdeElMenu(page, lead.nombre, 'Anotar seguimiento…')
  await modal.getByLabel('Resumen').fill('Anotado desde el resumen')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await expect(drawer).toBeVisible()
  expect(await seguimientosEnLaBase(lead.id)).toHaveLength(1)
  // El resumen relee su lead y la fila su página: el último seguimiento se ve en los dos.
  await expect(drawer.getByText(/Anotado desde el resumen/)).toBeVisible()
})

test('agendar desde el «⋯» del resumen: el modal va adentro y al guardar el recordatorio se ve', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Agendar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, `?lead=${lead.id}`, lead.nombre)
  const drawer = drawerDe(page, lead.nombre)
  await desdeElMenu(page, lead.nombre, 'Agendar recordatorio…')
  const modal = modalDeRecordatorio(page, 'Agendar')
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  await modal.getByLabel('De qué es').fill('Llamarlo el lunes')
  await modal.getByRole('button', { name: 'Mañana 09:00' }).click()
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await expect(drawer).toBeVisible()
  expect(await recordatoriosEnLaBase(lead.id)).toHaveLength(1)
  await expect(drawer.getByText('Llamarlo el lunes')).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('fuera de la cartera: el «⋯» no ofrece anotar ni agendar, y la URL no abre el modal', async ({
  page,
}, info) => {
  const ajeno = await nuevoLead({
    corto: `Rap Ajeno ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  await entrar(page, t.personas.duena)
  await irAlDrawer(page, `?lead=${ajeno.id}`, ajeno.nombre)
  const menu = await abrirMenuDelLead(page, ajeno.nombre)
  await expect(menu.getByRole('menuitem', { name: 'Anotar seguimiento…' })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: 'Agendar recordatorio…' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await irAlDrawer(page, `?lead=${ajeno.id}&panel=anotar-seguimiento`, ajeno.nombre)
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
})

test('`?pestana=` de antes lleva a la ficha en su bloque, con el modal que traía', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Viejo ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await page.goto(`/leads?lead=${lead.id}&pestana=recordatorios&panel=agendar-recordatorio`)
  await expect(page).toHaveURL(
    new RegExp(`/leads/${lead.id}\\?seccion=seguimientos&panel=agendar-recordatorio`),
  )
  await expect(modalDeRecordatorio(page, 'Agendar')).toBeVisible()
  await page.goto(`/leads?lead=${lead.id}&pestana=seguimientos`)
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=seguimientos$`))
  await expect(
    page.getByRole('heading', { name: 'Seguimientos y recordatorios', level: 2 }),
  ).toBeFocused()
})
