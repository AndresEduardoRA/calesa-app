import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona, telefonoAlAzar } from './soporte/leads-alta'
import { crearLead, exigir } from './soporte/leads'
import {
  PROPIO_DALIA,
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { esperarMarca } from './soporte/vistos'

// «Visto» como un correo leído en la lista de leads: lo no visto en negrita, lo visto (también el último) en peso normal, y abrir otro lead (su
// ficha, desde la fila) mueve
// «Último visto» sin quitarle el visto al anterior. Vehículos, logística y la agenda lo prueban en `vistos.spec.ts`, `vistos-por-modulo.spec.ts` y
// `agenda-vistos.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
// Los tres leads propios de la dueña: la lista es la suya.
const SEGUNDO = 'Segundo de Dalia'
const TERCERO = 'Tercero de Dalia'

async function borrarVistosDeLaDuena() {
  const duena = await idDePersona(t.personas.duena)
  exigir(
    (await admin().from('vistos').delete().eq('modulo', 'leads').eq('usuario_id', duena)).error,
    'borrar lo visto de la dueña en leads',
  )
}

// La ficha registra la visita después de dibujarse (`RegistrarVisto`): se espera la fila en la base antes de volver, o la lista podría releer
// las marcas antes de la escritura.
async function abrirYVolver(page: Page, fila: Locator) {
  await fila.click({ position: { x: 6, y: 6 } })
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/)
  const id = new URL(page.url()).pathname.split('/').at(-1) ?? ''
  const duena = await idDePersona(t.personas.duena)
  await expect
    .poll(async () => {
      const { data, error } = await admin()
        .from('vistos')
        .select('referencia_id')
        .eq('modulo', 'leads')
        .eq('usuario_id', duena)
        .eq('referencia_id', id)
      exigir(error, 'leer lo visto de la dueña')
      return data?.length ?? 0
    })
    .toBe(1)
  await page.goBack()
  await expect(page).toHaveURL(/\/leads$/)
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  for (const corto of [SEGUNDO, TERCERO]) {
    await crearLead({
      nombre: corto,
      telefono: `${t.codigo}${telefonoAlAzar()}`,
      deQuien: t.personas.duena,
    })
  }
})

test.afterAll(async () => {
  await borrarVistosDeLaDuena()
  await limpiarListado(t)
})

test('E2E en leads: abrir uno lo deja en peso normal, abrir otro mueve «Último visto» y los demás siguen en negrita', async ({
  page,
}) => {
  await borrarVistosDeLaDuena()
  await entrar(page, t.personas.duena)
  await irALeads(page)
  const primero = delLead(page, PROPIO_DALIA).first()
  const dalia = delLead(page, SEGUNDO).first()
  const carlos = delLead(page, TERCERO).first()
  await esperarMarca(primero, 'nuevo')
  await esperarMarca(dalia, 'nuevo')
  await esperarMarca(carlos, 'nuevo')

  await abrirYVolver(page, primero)
  await esperarMarca(primero, 'ultimo')
  await esperarMarca(dalia, 'nuevo')
  await esperarMarca(carlos, 'nuevo')

  // Otro: él es el último, el primero sigue visto (peso normal, sin «Último visto») y el tercero sigue en negrita.
  await abrirYVolver(page, dalia)
  await esperarMarca(dalia, 'ultimo')
  await esperarMarca(primero, 'visto')
  await esperarMarca(carlos, 'nuevo')

  // Se registró en la base: al recargar, igual.
  await page.reload()
  await esperarMarca(dalia, 'ultimo')
  await esperarMarca(primero, 'visto')
  await esperarMarca(carlos, 'nuevo')
})
