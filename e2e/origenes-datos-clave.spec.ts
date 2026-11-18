import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { expect, test, type Page } from './soporte/prueba'
import { agregarCampo } from './soporte/vehiculos'

// @sin-celular-archivo: Configuración › Orígenes no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// Los datos clave de un origen en «Campos»: el enlace viejo `?seccion=campos` lleva a la sub-ruta; un origen manual nace con los 4 de
// fábrica (Año, Kilometraje, VIN, Categoría) y la estrella de un campo se apaga con el tope a la vista; quitar uno, marcar el campo y
// subirlo se guardan al instante, sobreviven a recargar y quedan así en la base; desactivar el campo lo saca. El permiso, la versión, los
// topes y la limpieza los prueba `supabase/tests/areas/origenes/datos-clave.sql`; la carrera, `carreras.mjs`.
test.describe.configure({ mode: 'serial' })

const COLOR = 'Color e2e'
const TOPE = 'Ya hay 4 datos clave: quita uno para sumar este.'

let proyecto = ''
let claveDeOrigen = ''
let duena = ''
let origen: { id: string; nombre: string }

async function datosClaveDeLaBase(id: string): Promise<unknown> {
  const { data, error } = await admin()
    .from('origenes')
    .select('datos_clave')
    .eq('id', id)
    .limit(1)
    .single<{ datos_clave: unknown }>()
  if (error) {
    throw new Error(`No se pudo leer el origen: ${error.message}`)
  }
  return data.datos_clave
}

// El bloque es una `<section>` con su `h2`: una región con ese nombre. Lo que dice cada fila, en orden (el nombre de cada dato).
async function enOrden(page: Page): Promise<string[]> {
  const filas = page.getByRole('region', { name: /^Datos clave \(\d de 4\)$/ }).locator('ol > li')
  return (await filas.locator('span.font-medium').allTextContents()).map((texto) => texto.trim())
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDeOrigen = `datos_clave_${proyecto}`
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-datos-clave-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Clave' })
  origen = await crearOrigenDePrueba(`Datos clave ${proyecto}`, claveDeOrigen)
  await agregarCampo(origen.id, { clave: 'color_e2e', etiqueta: COLOR, tipo: 'texto' })
})

test.afterAll(async () => {
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: elegir, ordenar y quitar los datos clave de un origen se guarda al instante', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })

  // El enlace de antes lleva a la sub-ruta; el origen nació con los 4 de fábrica de un manual.
  await page.goto(`/configuracion/origenes/${origen.id}?seccion=campos`)
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${origen.id}/campos$`))
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  expect(await enOrden(page)).toEqual(['Año', 'Kilometraje', 'VIN', 'Categoría'])

  // Con 4, la estrella del campo se apaga con el motivo a la vista.
  const estrellaDelColor = page.getByRole('button', { name: `Marcar «${COLOR}» como dato clave` })
  await expect(estrellaDelColor).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText(TOPE)).toBeVisible()

  // Quitar VIN deja 3; marcar el campo lo suma al final; subirlo lo deja tercero. Cada cambio espera al anterior.
  await page.getByRole('button', { name: 'Quitar «VIN»', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Datos clave (3 de 4)', level: 2 })).toBeVisible()
  await expect(estrellaDelColor).not.toHaveAttribute('aria-disabled', 'true')
  await estrellaDelColor.click()
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  await expect(
    page.getByRole('button', { name: `Quitar «${COLOR}» de los datos clave` }),
  ).toHaveAttribute('aria-pressed', 'true')
  const subir = page.getByRole('button', { name: `Subir «${COLOR}»`, exact: true })
  await expect(subir).not.toHaveAttribute('aria-disabled', 'true')
  expect(await enOrden(page)).toEqual(['Año', 'Kilometraje', 'Categoría', COLOR])
  await subir.click()
  await expect.poll(() => enOrden(page)).toEqual(['Año', 'Kilometraje', COLOR, 'Categoría'])

  // Queda así en la base y sobrevive a recargar.
  await expect
    .poll(() => datosClaveDeLaBase(origen.id))
    .toEqual([
      { comun: 'anio' },
      { comun: 'kilometraje' },
      { campo: 'color_e2e' },
      { comun: 'categoria_id' },
    ])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  expect(await enOrden(page)).toEqual(['Año', 'Kilometraje', COLOR, 'Categoría'])

  // Desactivar el campo lo saca de los datos clave en la misma llamada.
  await page.getByRole('button', { name: `Editar ${COLOR}` }).click()
  const panel = page.getByRole('dialog')
  await panel.getByRole('switch', { name: 'Activo' }).click()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${COLOR}» guardado`)
  await expect(page.getByRole('heading', { name: 'Datos clave (3 de 4)', level: 2 })).toBeVisible()
  expect(await enOrden(page)).toEqual(['Año', 'Kilometraje', 'Categoría'])
  await expect
    .poll(() => datosClaveDeLaBase(origen.id))
    .toEqual([{ comun: 'anio' }, { comun: 'kilometraje' }, { comun: 'categoria_id' }])
})
