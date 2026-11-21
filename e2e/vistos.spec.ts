import { expect, test } from './soporte/prueba'
import { editarTarjeta } from './soporte/empresa'
import { entrar } from './soporte/inventario'
import { sql, literal } from './soporte/sql'
import { vehiculoPorTitulo } from './soporte/vehiculos'
import { esperarMarca } from './soporte/vistos'
import {
  OTRO,
  TITULO,
  abrirLaFicha,
  alInventario,
  limpiarLista,
  prepararLista,
  type TerrenoDeLaLista,
} from './soporte/vehiculos-lista'

// «Visto» y «último visto» por persona y módulo: abrir la ficha de un vehículo desde la lista lo marca en la lista de Vehículos al
// volver, se recuerda al recargar, y «Vistos» apagado en `/perfil` no marca nada.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaLista
let otro = ''

test.beforeAll(async ({}, info) => {
  t = await prepararLista(`${info.project.name}_vistos`)
  otro = (await vehiculoPorTitulo(OTRO))?.id ?? ''
})

test.afterAll(async () => {
  sql(
    `delete from public.vistos where referencia_id in (${literal(t.id)}::uuid, ${literal(otro)}::uuid)`,
  )
  await limpiarLista(t.id)
})

const filaDe = (page: Parameters<typeof alInventario>[0], titulo: string) =>
  page.locator('tbody tr, li article').filter({ hasText: titulo })

// La ficha registra la visita después de dibujarse (`RegistrarVisto`): se espera la fila en la base antes de volver, o la lista podría
// releer las marcas antes de la escritura.
async function esperarElRegistro(id: string) {
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.vistos where referencia_id = ${literal(id)}::uuid and modulo = 'vehiculos'`,
      ),
    )
    .toBe('1')
}

async function abrirYVolver(page: Parameters<typeof alInventario>[0], titulo: string, id: string) {
  await abrirLaFicha(page, titulo, id)
  await esperarElRegistro(id)
  await page.goBack()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)
}

test('E2E abrir un vehículo lo marca como el último visto, y se recuerda al volver', async ({
  page,
}) => {
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO).getByTitle('Último visto', { exact: true })).toHaveCount(0)
  await abrirYVolver(page, TITULO, t.id)
  await expect(filaDe(page, TITULO).first()).toHaveAttribute('data-visto', 'ultimo')
  await expect(filaDe(page, TITULO).getByTitle('Último visto', { exact: true })).toBeVisible()
  // Sin texto a la vista: el lector lo oye (`sr-only`) y el icono cabe dentro de la fila, sin ensancharla.
  await expect(filaDe(page, TITULO).first()).toContainText('último visto')
  await expect(filaDe(page, TITULO).first().getByText('Último visto', { exact: true })).toHaveCount(
    0,
  )
  const fila = await filaDe(page, TITULO).first().boundingBox()
  const marca = await filaDe(page, TITULO)
    .first()
    .getByTitle('Último visto', { exact: true })
    .boundingBox()
  expect(marca && fila && marca.x + marca.width <= fila.x + fila.width).toBe(true)
  await expect(filaDe(page, OTRO).first()).toHaveAttribute('data-visto', 'nuevo')
  // Se registró en la base: al recargar, la trae.
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.vistos where referencia_id = ${literal(t.id)}::uuid and modulo = 'vehiculos'`,
      ),
    )
    .toBe('1')
  await page.reload()
  await expect(filaDe(page, TITULO).getByTitle('Último visto', { exact: true })).toBeVisible()
})

test('E2E como un correo: lo no visto en negrita, lo visto en peso normal, y abrir otro mueve «Último visto» sin quitar el visto', async ({
  page,
}) => {
  sql(
    `delete from public.vistos where modulo = 'vehiculos' and referencia_id in (${literal(t.id)}::uuid, ${literal(otro)}::uuid)`,
  )
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  await esperarMarca(filaDe(page, TITULO).first(), 'nuevo')
  await esperarMarca(filaDe(page, OTRO).first(), 'nuevo')

  await abrirYVolver(page, TITULO, t.id)
  await esperarMarca(filaDe(page, TITULO).first(), 'ultimo')
  await esperarMarca(filaDe(page, OTRO).first(), 'nuevo')

  // Abrir otro: él es el último y el primero sigue visto (peso normal), ya sin «Último visto».
  await abrirYVolver(page, OTRO, otro)
  await esperarMarca(filaDe(page, OTRO).first(), 'ultimo')
  await esperarMarca(filaDe(page, TITULO).first(), 'visto')
  sql(
    `delete from public.vistos where referencia_id in (${literal(t.id)}::uuid, ${literal(otro)}::uuid)`,
  )
})

test('E2E con «Vistos» apagado en el perfil la lista no marca nada', async ({ page }) => {
  await entrar(page, t.lector)
  await page.goto('/perfil')
  const preferencias = await editarTarjeta(page, 'Preferencias')
  const bloque = preferencias.getByRole('group', { name: 'Marcar lo que abrí' })
  await bloque.getByText('No', { exact: true }).click()
  await expect
    .poll(() =>
      sql(
        `select valor ->> 'activado' from public.preferencias_usuario p join auth.users u on u.id = p.usuario_id where u.email = ${literal(t.lector)} and p.clave = 'vistos'`,
      ),
    )
    .toBe('false')
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO).getByTitle('Último visto', { exact: true })).toHaveCount(0)
  await expect(filaDe(page, TITULO).first()).not.toHaveAttribute('data-visto', /.+/)
})
