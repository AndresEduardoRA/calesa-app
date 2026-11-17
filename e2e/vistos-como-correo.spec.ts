import { expect, test } from './soporte/prueba'
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

// «Visto» como un correo leído en la lista de leads: lo no visto en negrita, lo visto (también el último) en peso normal, y abrir otro lead mueve
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

  await primero.click({ position: { x: 6, y: 6 } })
  await expect(page).toHaveURL(/lead=/)
  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/lead=/)
  await esperarMarca(primero, 'ultimo')
  await esperarMarca(dalia, 'nuevo')
  await esperarMarca(carlos, 'nuevo')

  // Otro: él es el último, el primero sigue visto (peso normal, sin «Último visto») y el tercero sigue en negrita.
  await dalia.click({ position: { x: 6, y: 6 } })
  await expect(page).toHaveURL(/lead=/)
  await page.keyboard.press('Escape')
  await esperarMarca(dalia, 'ultimo')
  await esperarMarca(primero, 'visto')
  await esperarMarca(carlos, 'nuevo')

  // Se registró en la base: al recargar, igual.
  await page.reload()
  await esperarMarca(dalia, 'ultimo')
  await esperarMarca(primero, 'visto')
  await esperarMarca(carlos, 'nuevo')
})
