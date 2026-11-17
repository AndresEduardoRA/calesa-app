import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarCadena, sembrarCadena, type TerrenoDeLaCadena } from './soporte/cadena'
import { literal, sql } from './soporte/sql'
import { esperarMarca } from './soporte/vistos'

// «Visto» y «último visto» son de cada módulo: abrir un vehículo en su ficha de Vehículos lo marca ahí y no en Logística, y abrirlo en
// `/logistica/vehiculo/[id]` lo marca en Logística y no en Vehículos. Los dos contextos usan el mismo tipo (`vehiculo`): sólo el módulo los separa.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLaCadena

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-vistos-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Vistos',
  })
  terreno = await sembrarCadena(proyecto)
})

test.afterAll(async () => {
  // Los vistos se van por cascada con la persona, pero se borran antes por si ella sigue (la carrera con la baja de los vehículos).
  sql(
    `delete from public.vistos where referencia_id in (${[terreno.demorado.id, terreno.reciente.id].map(literal).join(', ')})`,
  )
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// La fila (escritorio) o la tarjeta (celular) de un vehículo de la página.
const filaDe = (page: Page, titulo: string): Locator =>
  page.locator('tbody tr, li article').filter({ hasText: titulo }).first()

const vistosDe = (id: string, modulo: string): string =>
  sql(
    `select count(*) from public.vistos where referencia_id = ${literal(id)}::uuid and modulo = ${literal(modulo)}`,
  )

// Abre el vehículo desde su fila en la lista de la fase y espera a que Logística lo registre; vuelve con «atrás».
async function abrirEnLogistica(page: Page, unidad: { id: string; titulo: string }): Promise<void> {
  await filaDe(page, unidad.titulo).locator(`a[data-unidad="${unidad.id}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${unidad.id}`))
  await expect.poll(() => vistosDe(unidad.id, 'logistica')).toBe('1')
  await page.goBack()
  await expect(filaDe(page, unidad.titulo)).toBeVisible()
}

test('E2E abrir un vehículo en Logística lo marca como último y abrir otro deja el primero visto', async ({
  page,
}) => {
  const { demorado, reciente } = terreno
  await entrar(page, terreno.persona, { fresco: true })
  // En su ficha de Vehículos queda visto en Vehículos.
  await page.goto(`/vehiculos/${demorado.id}`)
  await expect.poll(() => vistosDe(demorado.id, 'vehiculos')).toBe('1')

  // En la lista de la fase de Logística no lo está.
  await page.goto(`/logistica/fase/${terreno.fases.transito}?origen=${terreno.a.id}`)
  await expect(filaDe(page, demorado.titulo)).toBeVisible()
  await expect(filaDe(page, demorado.titulo)).toHaveAttribute('data-visto', 'nuevo')
  await expect(filaDe(page, demorado.titulo).getByText('Último visto')).toHaveCount(0)

  // Abrirlo en Logística lo marca como el último al volver.
  await abrirEnLogistica(page, demorado)
  await expect(filaDe(page, demorado.titulo)).toHaveAttribute('data-visto', 'ultimo')
  await expect(filaDe(page, demorado.titulo).getByText('Último visto')).toBeVisible()
  // Lo no visto de la lista, en negrita; lo abierto, en peso normal.
  await esperarMarca(filaDe(page, reciente.titulo), 'nuevo')
  await esperarMarca(filaDe(page, demorado.titulo), 'ultimo')

  // Abrir el otro: ése es el último y el primero queda visto.
  await abrirEnLogistica(page, reciente)
  await expect(filaDe(page, reciente.titulo)).toHaveAttribute('data-visto', 'ultimo')
  await expect(filaDe(page, demorado.titulo)).toHaveAttribute('data-visto', 'visto')
  await expect(filaDe(page, demorado.titulo).getByText('Último visto')).toHaveCount(0)
  // Como un correo: el último y el visto, en peso normal.
  await esperarMarca(filaDe(page, reciente.titulo), 'ultimo')
  await esperarMarca(filaDe(page, demorado.titulo), 'visto')
})

test('E2E lo visto en Logística no cuenta en Vehículos', async ({ page }) => {
  const { demorado, reciente } = terreno
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/vehiculos?origen=${terreno.a.id}`)
  // En el inventario, el último es el de la ficha (el demorado) y el que sólo se abrió en Logística no tiene marca.
  await expect(filaDe(page, demorado.titulo)).toHaveAttribute('data-visto', 'ultimo')
  await expect(filaDe(page, reciente.titulo)).toHaveAttribute('data-visto', 'nuevo')
  await expect(filaDe(page, reciente.titulo).getByText('Último visto')).toHaveCount(0)
})
