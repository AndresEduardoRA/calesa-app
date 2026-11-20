// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { tipearEnLaHoja } from './soporte/cotizar-guardar'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { abrirLaVistaPrevia, alDia, hoja, tarjeta } from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'
import { rgbDe } from './soporte/tarjeta-cuadricula'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// Empezar un origen desde una plantilla de V1 (`docs/UX.md` › «Cotización: empezar desde una plantilla»): «Empezar desde una plantilla» abre el modal con las cuatro;
// la primera crea los borradores de la fórmula y de la tarjeta (sin preguntar: no había); la segunda pregunta antes de reemplazarlos, y «Volver» no escribe nada.
// Publicados, el origen cotiza y la vista previa es la tarjeta de V1 (textos y colores de sus celdas). Los colores `v1_…` que este spec crea se borran al final.
test.describe.configure({ mode: 'serial' })

let duena = ''
let lead = ''
let vehiculo = ''
let origen = { id: '', nombre: '' }
let coloresDeAntes: string[] = []

const coloresV1 = () =>
  sql(
    "select coalesce(string_agg(clave, ',' order by clave), '') from public.tonos where clave like 'v1\\_%'",
  )
    .split(',')
    .filter((x) => x !== '')

function borrarLoQueCree(): void {
  borrarOrigenesDeCotizar()
  const nuevos = coloresV1().filter((c) => !coloresDeAntes.includes(c))
  if (nuevos.length > 0) {
    sql(`delete from public.tonos where clave in (${nuevos.map(literal).join(', ')})`)
  }
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  coloresDeAntes = coloresV1()
  borrarOrigenesDeCotizar()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-pv1-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Plantilla' })
  origen = await crearOrigenDeCotizar(proyecto, 'pv1', false)
  const titulo = `Plantilla V1 Hilux ${proyecto}`
  await cargarVehiculos(origen.id, [{ titulo, anio: 2026 }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  lead = await crearLead({
    nombre: `plantilla v1 ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoQueCree()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
})

const modal = (page: Page) => page.getByRole('dialog', { name: 'Empezar desde una plantilla' })
const opcion = (page: Page, nombre: string) =>
  modal(page).getByRole('radio', { name: new RegExp(`^${nombre.replace(/[()]/g, '\\$&')}`) })
const nota = (nombre: string) => `Empezado desde la plantilla de V1 «${nombre}».`
const borrador = (tabla: 'formulas' | 'plantillas_tarjeta') =>
  sql(
    `select coalesce(nota, '') from public.${tabla} where origen_id = ${literal(origen.id)} and estado = 'borrador'`,
  )

async function abrirElModal(page: Page): Promise<void> {
  await page.goto(`/configuracion/origenes/${origen.id}/formula`)
  await page.getByRole('button', { name: 'Empezar desde una plantilla' }).click()
  await expect(page).toHaveURL(/panel=plantillas-de-v1/)
  await expect(modal(page)).toBeVisible()
  await expect(modal(page).getByRole('radio')).toHaveCount(4)
}

test('E2E escritorio: la primera plantilla crea los dos borradores sin preguntar y lleva a la Fórmula', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElModal(page)
  for (const nombre of ['USA (subasta)', 'China', 'Oficina', 'Compra dealer USA']) {
    await expect(opcion(page, nombre)).toBeVisible()
  }
  // Cada una con su tarjeta de ejemplo dibujada por el lienzo de la pestaña Tarjeta.
  await expect(modal(page).locator('[data-tarjeta-de-cotizacion]')).toHaveCount(4)
  await opcion(page, 'China').check()
  await modal(page).getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(
    page.getByText(
      'Se crearon los borradores de la fórmula y de la tarjeta desde «China». Revísalos y publícalos.',
    ),
  ).toBeVisible()
  await expect(modal(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('region', { name: 'Borrador' })).toContainText(nota('China'))
  expect(borrador('formulas')).toBe(nota('China'))
  expect(borrador('plantillas_tarjeta')).toBe(nota('China'))
})

test('E2E escritorio: sobre borradores existentes pregunta; «Volver» no escribe y «Reemplazar» los cambia', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElModal(page)
  const acciones: string[] = []
  page.on('request', (pedido) => {
    if (pedido.headers()['next-action']) acciones.push(pedido.url())
  })
  await opcion(page, 'USA (subasta)').check()
  await modal(page).getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(
    modal(page).getByText(
      /ya tiene un borrador de la fórmula \(tuyo, .*\) y de la tarjeta \(guardado .*\)\. Usar «USA \(subasta\)» los reemplaza\./,
    ),
  ).toBeVisible()
  await modal(page).getByRole('button', { name: 'Volver' }).click()
  await expect(opcion(page, 'USA (subasta)')).toBeChecked()
  expect(acciones).toEqual([])
  expect(borrador('formulas')).toBe(nota('China'))
  await modal(page).getByRole('button', { name: 'Usar esta plantilla' }).click()
  await modal(page).getByRole('button', { name: 'Reemplazar' }).click()
  await expect(page.getByText(/desde «USA \(subasta\)»\. Revísalos y publícalos\./)).toBeVisible()
  expect(borrador('formulas')).toBe(nota('USA (subasta)'))
  expect(borrador('plantillas_tarjeta')).toBe(nota('USA (subasta)'))
})

test('E2E escritorio: publicadas la fórmula y la tarjeta, el origen cotiza y la vista previa es la tarjeta de V1', async ({
  page,
}) => {
  await entrar(page, duena)
  // La fórmula.
  await page.goto(`/configuracion/origenes/${origen.id}/formula?panel=publicar-formula`)
  const publicarFormula = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await publicarFormula.getByLabel('Nota').fill('Desde la plantilla de V1')
  await publicarFormula.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Se publicó el borrador.')).toBeVisible()
  // La tarjeta.
  await page.goto(`/configuracion/origenes/${origen.id}/formula/tarjeta?panel=publicar-tarjeta`)
  const publicarTarjeta = page.getByRole('dialog', { name: /^Publicar la tarjeta de / })
  await publicarTarjeta.getByLabel('Nota de la versión').fill('Desde la plantilla de V1')
  await publicarTarjeta.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Se publicó la tarjeta.')).toBeVisible()
  // Cotizar en el origen: Auto gasolina, el remate y la grúa.
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}&vehiculo=${vehiculo}`)
  await expect(hoja(page)).toBeVisible()
  await page.locator('label', { hasText: 'Auto gasolina' }).click()
  await expect(page.getByRole('radio', { name: 'Auto gasolina' })).toBeChecked()
  await tipearEnLaHoja(page, 'remate', '32900')
  await tipearEnLaHoja(page, 'grua', '1350')
  await alDia(page)
  const t = await abrirLaVistaPrevia(page)
  const celda = (id: string) => t.locator(`[data-celda="${id}"]`)
  await expect(celda('fecha')).not.toBeEmpty()
  await expect(celda('categoria')).toHaveText('COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOLIVIA')
  await expect(celda('asesor_rotulo')).toHaveText('Asesor:')
  await expect(celda('cab_tc')).toHaveText('Tipo $ Cambio')
  await expect(celda('cab_plazo')).toHaveText('Plazos Pagos')
  await expect(celda('remate_concepto')).toHaveText('Remate (costo aprox.)')
  await expect(celda('grua_descripcion')).toHaveText('Traslado al puerto (USA)')
  await expect(celda('primer_pago_plazo')).toHaveText('2 días')
  await expect(celda('total_etiqueta')).toHaveText('TOTAL DÓLARES:')
  await expect(celda('total_nota')).toHaveText(
    'Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación)',
  )
  await expect(celda('nota')).toHaveText(/^Nota: Esta es una cotización referencial\./)
  // Los conceptos con el color de su grupo, como V1.
  await expect(celda('remate_concepto')).toHaveCSS('background-color', rgbDe('v1_verde'))
  await expect(celda('grua_concepto')).toHaveCSS('background-color', rgbDe('v1_amarillo'))
  await expect(celda('nacionalizacion_concepto')).toHaveCSS('background-color', rgbDe('v1_naranja'))
  await expect(celda('total_etiqueta')).toHaveCSS('background-color', rgbDe('v1_amarillo_fuerte'))
  // Lo que no aplica a un auto a gasolina no se dibuja.
  for (const fila of ['n_export', 'n_transporte_chile', 'n_cuenta_especial']) {
    await expect(tarjeta(page).locator(`[data-fila="${fila}"]`), fila).toHaveCount(0)
  }
})
