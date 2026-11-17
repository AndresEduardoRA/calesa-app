import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { exigir } from './soporte/leads'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// «Visto» y «último visto» en los chips de la agenda: el último es uno solo en todo el módulo, sea evento o tarea (dos tipos). Spec aparte de
// `agenda.spec.ts` (pasaba el tope de líneas) y con su propio terreno.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let eventoId = ''
let tareaId = ''
const rotulo = (proyecto: string) => `Agenda vistos e2e ${proyecto}`

// Lo que la asesora abrió en la agenda: la prueba parte de cero y no deja nada.
async function borrarVistosDeLaAsesora() {
  const berta = await idDePersona(t.personas.berta)
  exigir(
    (await admin().from('vistos').delete().eq('modulo', 'agenda').eq('usuario_id', berta)).error,
    'borrar lo visto de la asesora en la agenda',
  )
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  const duena = await idDePersona(t.personas.duena)
  const berta = await idDePersona(t.personas.berta)
  const ahora = new Date().toISOString()
  const evento = await admin()
    .from('eventos')
    .insert({
      titulo: `${rotulo(info.project.name)} reunión`,
      inicia_en: ahora,
      visibilidad: 'seleccionados',
      creado_por: duena,
    })
    .select('id')
    .single()
  exigir(evento.error, 'sembrar el evento')
  eventoId = evento.data?.id ?? ''
  exigir(
    (await admin().from('eventos_destinatarios').insert({ evento_id: eventoId, usuario_id: berta }))
      .error,
    'invitar a la asesora',
  )
  const tarea = await admin()
    .from('tareas')
    .insert({
      titulo: `${rotulo(info.project.name)} llamar`,
      vence_en: ahora,
      creado_por: duena,
      responsable_id: berta,
    })
    .select('id')
    .single()
  exigir(tarea.error, 'sembrar la tarea')
  tareaId = tarea.data?.id ?? ''
})

test.afterAll(async () => {
  await borrarVistosDeLaAsesora()
  await admin().from('eventos').delete().eq('id', eventoId)
  await admin().from('tareas').delete().eq('id', tareaId)
  await limpiarListado(t)
})

test('E2E abrir un evento y luego una tarea los marca: sólo uno es el último visto de la agenda', async ({
  page,
}, info) => {
  await borrarVistosDeLaAsesora()
  const evento = new RegExp(`${rotulo(info.project.name)} reunión`)
  const tarea = new RegExp(`${rotulo(info.project.name)} llamar`)
  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  const chipDelEvento = page.getByRole('main').getByRole('link', { name: evento })
  const chipDeLaTarea = page.getByRole('main').getByRole('link', { name: tarea })
  await expect(chipDelEvento).toBeVisible()
  await expect(chipDelEvento).toHaveAttribute('data-visto', 'nuevo')
  // En el chip la negrita no se distingue (el fondo es de la clase y su nombre ya va en negrita): «visto» lleva una tilde y lo nuevo no.
  await expect(chipDelEvento.locator('svg')).toHaveCount(0)

  // El evento: su panel se abre por la URL, que es lo que lo registra; al cerrarlo, el chip es el último visto.
  await chipDelEvento.click()
  await expect(page).toHaveURL(/evento=/)
  const detalle = page.getByRole('dialog', { name: 'Evento', exact: true })
  await expect(detalle).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()
  await expect(chipDelEvento).toHaveAttribute('data-visto', 'ultimo')
  await expect(chipDelEvento.getByText('Último visto')).toBeVisible()

  // La tarea: ahora ella es la última (un solo último en toda la agenda) y el evento queda visto.
  await chipDeLaTarea.click()
  await expect(page).toHaveURL(/tarea=/)
  const detalleDeTarea = page.getByRole('dialog', { name: 'Tarea', exact: true })
  await expect(detalleDeTarea).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalleDeTarea).toBeHidden()
  await expect(chipDeLaTarea).toHaveAttribute('data-visto', 'ultimo')
  await expect(chipDelEvento).toHaveAttribute('data-visto', 'visto')
  await expect(chipDelEvento.getByText('Último visto')).toHaveCount(0)
  await expect(chipDelEvento.locator('svg')).toHaveCount(1)
  await expect(chipDeLaTarea.locator('svg')).toHaveCount(1)

  // Al recargar la trae la base: el último de los dos tipos es la tarea.
  const berta = await idDePersona(t.personas.berta)
  await expect
    .poll(async () => {
      const { data } = await admin()
        .from('vistos')
        .select('referencia_id')
        .eq('modulo', 'agenda')
        .eq('usuario_id', berta)
        .limit(5)
      return data?.length
    })
    .toBe(2)
  await page.reload()
  await expect(chipDeLaTarea).toHaveAttribute('data-visto', 'ultimo')
  await expect(chipDelEvento).toHaveAttribute('data-visto', 'visto')
})
