import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { exigir } from './soporte/leads'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { meterRecordatorio } from './soporte/leads-seguimientos'
import { capturar } from './soporte/recorrido'
import { botonDeVistaYOpciones } from './soporte/vista-y-opciones'

// La agenda como libreta (T37): al entrar, la hoja del día hora por hora con la hora actual marcada y los pendientes al costado (vencidas, recordatorios y
// sin fecha); «Completar» en un toque; semana y mes a un clic; un solo «Nuevo» que pregunta qué (un evento con su lead, una tarea con responsable); los
// enlaces viejos abren lo suyo.
test.describe.configure({ mode: 'serial' })

const ZONA = 'America/La_Paz'
let t: TerrenoDelListado
let berta = ''
let leadId = ''
let eventoId = ''
let vencidaId = ''
let recordatorioId = ''
const rotulo = (proyecto: string) => `Libreta e2e ${proyecto}`
const diaEnLaPaz = (instante: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(instante)
const hoja = (page: Page) => page.getByRole('region', { name: 'Hoja del día' })
const pendientes = (page: Page) => page.getByRole('region', { name: 'Pendientes' })
const modalDeNuevo = (page: Page) => page.getByRole('dialog', { name: 'Nuevo', exact: true })

// «Nuevo en la agenda» (insiste hasta que la página hidrata) y lo que ofrece.
async function abrirNuevoEnLaAgenda(page: Page): Promise<string[]> {
  // Un clic antes de hidratar se pierde: se repite sólo si el modal no llegó (con el modal abierto, el botón queda tapado).
  await expect(async () => {
    if (!(await modalDeNuevo(page).isVisible())) {
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Nuevo en la agenda' })
        .click({ timeout: 2000 })
    }
    await expect(modalDeNuevo(page)).toBeVisible({ timeout: 3000 })
  }).toPass()
  return modalDeNuevo(page)
    .getByRole('list', { name: 'Qué crear' })
    .getByRole('listitem')
    .locator('button > span > span:first-child')
    .allTextContents()
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  berta = await idDePersona(t.personas.berta)
  const duena = await idDePersona(t.personas.duena)
  // Recibir tareas: el rol de la asesora del terreno sólo trae permisos de leads.
  const rol = await admin()
    .from('usuarios_roles')
    .select('rol_id')
    .eq('usuario_id', berta)
    .single<{ rol_id: string }>()
  exigir(rol.error, 'leer el rol de la asesora')
  const ya = await admin()
    .from('roles_permisos')
    .select('id')
    .eq('rol_id', rol.data?.rol_id ?? '')
    .eq('permiso_clave', 'agenda.tareas.recibir')
    .limit(1)
  if ((ya.data ?? []).length === 0) {
    exigir(
      (
        await admin()
          .from('roles_permisos')
          .insert({ rol_id: rol.data?.rol_id ?? '', permiso_clave: 'agenda.tareas.recibir' })
      ).error,
      'dar a la asesora el permiso de recibir tareas',
    )
  }
  const hoy = diaEnLaPaz(new Date())
  // Las 10:00 de hoy en La Paz (UTC-4).
  const evento = await admin()
    .from('eventos')
    .insert({
      titulo: `${rotulo(info.project.name)} cita`,
      inicia_en: `${hoy}T14:00:00Z`,
      visibilidad: 'privado',
      creado_por: berta,
    })
    .select('id')
    .single()
  exigir(evento.error, 'sembrar el evento')
  eventoId = evento.data?.id ?? ''
  const vencida = await admin()
    .from('tareas')
    .insert({
      titulo: `${rotulo(info.project.name)} vencida`,
      vence_en: new Date(Date.now() - 26 * 3_600_000).toISOString(),
      creado_por: duena,
      responsable_id: berta,
    })
    .select('id')
    .single()
  exigir(vencida.error, 'sembrar la tarea vencida')
  vencidaId = vencida.data?.id ?? ''
  exigir(
    (
      await admin()
        .from('tareas')
        .insert({
          titulo: `${rotulo(info.project.name)} sin fecha`,
          creado_por: berta,
          responsable_id: berta,
        })
    ).error,
    'sembrar la tarea sin fecha',
  )
  const lead = await nuevoLead({
    corto: `Libreta Lead ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  leadId = lead.id
  recordatorioId = await meterRecordatorio({
    leadId,
    usuarioId: berta,
    titulo: `${rotulo(info.project.name)} recordar`,
    recordarEn: new Date(Date.now() - 3_600_000).toISOString(),
  })
})

test.afterAll(async ({}, info) => {
  await admin()
    .from('eventos')
    .delete()
    .like('titulo', `${rotulo(info.project.name)}%`)
  await admin()
    .from('tareas')
    .delete()
    .like('titulo', `${rotulo(info.project.name)}%`)
  await admin()
    .from('recordatorios')
    .delete()
    .like('titulo', `${rotulo(info.project.name)}%`)
  await limpiarListado(t)
})

test('E2E al entrar se ve el día hora por hora con los pendientes al costado', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await page.goto('/agenda')
  const dia = String(Number(diaEnLaPaz(new Date()).slice(8, 10)))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(dia)
  const horas = hoja(page).getByRole('list', { name: 'Horas' })
  for (const hora of ['08:00', '12:00', '19:00']) {
    await expect(horas.getByText(hora, { exact: true })).toBeVisible()
  }
  // La cita de las 10:00 cae en su fila.
  await expect(
    horas.locator(':scope > li').filter({ hasText: `${rotulo(info.project.name)} cita` }),
  ).toContainText('10:00')
  await expect(page.locator('[aria-current="time"]')).toHaveCount(1)
  for (const [grupo, titulo] of [
    ['Vencidas', 'vencida'],
    ['Recordatorios', 'recordar'],
    ['Sin fecha', 'sin fecha'],
  ] as const) {
    await expect(
      pendientes(page)
        .getByRole('region', { name: grupo })
        .getByRole('link', { name: new RegExp(`${rotulo(info.project.name)} ${titulo}`) }),
    ).toBeVisible()
  }
  await capturar(page, info, 'libreta-dia')
})

test('E2E «Completar» un pendiente lo saca de la lista y lo marca en la base', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await page.goto('/agenda')
  const vencida = `${rotulo(info.project.name)} vencida`
  await pendientes(page)
    .getByRole('button', { name: `Completar: ${vencida}` })
    .click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Tarea hecha.' }),
  ).toBeVisible()
  await expect(pendientes(page).getByRole('link', { name: new RegExp(vencida) })).toHaveCount(0)
  await expect
    .poll(
      async () =>
        (await admin().from('tareas').select('estado').eq('id', vencidaId).single()).data?.estado,
    )
    .toBe('completado')

  const recordar = `${rotulo(info.project.name)} recordar`
  await pendientes(page)
    .getByRole('button', { name: `Completar: ${recordar}` })
    .click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Recordatorio completado.' }),
  ).toBeVisible()
  await expect(pendientes(page).getByRole('link', { name: new RegExp(recordar) })).toHaveCount(0)
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from('recordatorios')
            .select('completado_en')
            .eq('id', recordatorioId)
            .single()
        ).data?.completado_en ?? null,
    )
    .not.toBeNull()
})

test('E2E semana y mes a un clic', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await page.goto('/agenda')
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page).toHaveURL(/vista=semana/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('–')
  await page.getByRole('tab', { name: 'Mes' }).click()
  await expect(page).toHaveURL(/vista=mes/)
  await expect(page.getByRole('region', { name: 'Hoja del día' })).toHaveCount(0)
})

test('E2E «Nuevo» pregunta qué: un evento con su lead y una tarea con responsable', async ({
  page,
}, info) => {
  const manana = diaEnLaPaz(new Date(Date.now() + 24 * 3_600_000))
  const titulo = `${rotulo(info.project.name)} visita`
  await entrar(page, t.personas.berta)
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(new RegExp(`fecha=${manana}`))
  expect(await abrirNuevoEnLaAgenda(page)).toEqual(['Evento', 'Tarea', 'Recordatorio'])
  await capturar(page, info, 'libreta-nuevo')
  await modalDeNuevo(page)
    .getByRole('button', { name: /^Evento/ })
    .click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo evento', exact: true })
  await expect(nuevo).toBeVisible()
  // Sin salir de la pantalla: el evento nace en el día que se mira.
  await expect(nuevo.getByLabel('Empieza')).toHaveValue(`${manana}T09:00`)
  await expect(page).toHaveURL(new RegExp(`fecha=${manana}`))
  await nuevo.getByLabel('Título', { exact: true }).fill(titulo)
  await nuevo.getByRole('button', { name: 'Vincular un lead' }).click()
  await nuevo.getByLabel('Buscar en tu cartera').fill(`Libreta Lead ${info.project.name}`)
  await nuevo.getByRole('button', { name: new RegExp(`Libreta Lead ${info.project.name}`) }).click()
  await expect(nuevo.getByRole('button', { name: 'Quitar el lead' })).toBeVisible()
  await capturar(page, info, 'libreta-evento-con-lead')
  await nuevo.getByRole('button', { name: 'Crear evento' }).click()
  const detalle = page.getByRole('dialog', { name: 'Evento', exact: true })
  await expect(
    detalle.getByRole('link', { name: `Libreta Lead ${info.project.name}` }),
  ).toBeVisible()
  await expect
    .poll(
      async () =>
        (await admin().from('eventos').select('lead_id').eq('titulo', titulo).single()).data
          ?.lead_id,
    )
    .toBe(leadId)

  // La dueña da una tarea a la asesora desde el mismo «Nuevo».
  const tarea = `${rotulo(info.project.name)} para Berta`
  await page.context().clearCookies()
  await entrar(page, t.personas.duena)
  await page.goto('/agenda')
  await abrirNuevoEnLaAgenda(page)
  await modalDeNuevo(page)
    .getByRole('button', { name: /^Tarea/ })
    .click()
  const nueva = page.getByRole('dialog', { name: 'Nueva tarea', exact: true })
  await nueva.getByLabel('Título', { exact: true }).fill(tarea)
  await nueva.getByLabel('Para otra persona (opcional)').fill('Berta Alta')
  await nueva.getByRole('button', { name: 'Berta Alta Prueba', exact: true }).click()
  await nueva.getByRole('button', { name: 'Crear tarea' }).click()
  await expect(page.getByRole('dialog', { name: 'Tarea', exact: true })).toBeVisible()
  await expect
    .poll(
      async () =>
        (await admin().from('tareas').select('responsable_id').eq('titulo', tarea).single()).data
          ?.responsable_id,
    )
    .toBe(berta)
})

test('E2E los enlaces viejos de la agenda abren lo suyo', async ({ page }) => {
  await entrar(page, t.personas.berta)
  const abre = async (consulta: string, dialogo: string | RegExp) => {
    await page.goto(`/agenda?${consulta}`)
    await expect(page.getByRole('dialog', { name: dialogo })).toBeVisible()
  }
  await abre(`evento=${eventoId}`, 'Evento')
  await abre(`evento=${eventoId}&editar=1`, 'Editar evento')
  await abre(`evento=${eventoId}&eliminar=evento`, /^Eliminar el evento/)
  await abre(`tarea=${vencidaId}`, 'Tarea')
  await abre('panel=nuevo-evento', 'Nuevo evento')
  await abre('panel=nueva-tarea', 'Nueva tarea')
  await abre(`recordatorio=${recordatorioId}`, 'Recordatorio')
  await page.goto('/agenda?vista=mes')
  await expect(page.getByRole('tab', { name: 'Mes', selected: true })).toBeVisible()
  await page.goto('/agenda?ver=tarea')
  await expect(botonDeVistaYOpciones(page)).toContainText('Tareas')
  // Sin `agenda.ver_todo`, `?de=todos` se ignora.
  await page.goto('/agenda?de=todos')
  await expect(botonDeVistaYOpciones(page)).not.toContainText('De todos')

  await page.context().clearCookies()
  await entrar(page, t.personas.duena)
  await page.goto('/agenda?de=todos')
  await expect(botonDeVistaYOpciones(page)).toContainText('De todos')
})
