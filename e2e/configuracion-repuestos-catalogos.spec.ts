// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  alternarActivo,
  elegirDelMenu,
  filaDeCatalogo,
  nombreDeLaFila,
} from './soporte/lista-de-catalogo'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Configuración › Repuestos (8.08-3): quien tiene `repuestos.configurar` entra por la sección al flujo de repuestos (su primera sub-sección) y a los cuatro
// catálogos, y la sección figura en el hub; la asesora de la semilla no tiene la clave y no entra. Se agrega, renombra, desactiva y elimina un tipo de pieza propio; el de la prueba se limpia por
// su nombre. Que uno en uso no se elimine lo prueba `supabase/tests/areas/repuestos/catalogos.sql` (K1, D31).
test.describe.configure({ mode: 'serial' })

let duena = ''
const NOMBRE = 'Pieza e2e'
const limpiarValores = () => {
  sql(`delete from repuestos_catalogos where nombre like ${literal(`${NOMBRE}%`)}`)
}
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conf-repuestos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Repuestos' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  limpiarValores()
})

test.afterAll(async () => {
  limpiarValores()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien configura repuestos entra al flujo y a los cuatro catálogos y el hub lista Repuestos', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/repuestos')
  // La sección abre «Flujo de repuestos»; «Cotizador de repuestos» y los catálogos están en el menú.
  await expect(page).toHaveURL(/\/configuracion\/repuestos\/flujo$/)
  await expect(page.getByRole('heading', { name: 'Flujo de repuestos', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()
  const menu = page.getByRole('navigation', { name: 'Secciones de Configuración' })
  await expect(menu.getByRole('link', { name: 'Flujo de repuestos' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(menu.getByRole('link', { name: 'Cotizador de repuestos' })).toBeVisible()
  // Los catálogos de repuestos: el renglón del menú (la sección Catálogos de la empresa también se llama así).
  const catalogos = menu.locator('a[href="/configuracion/repuestos/catalogos"]')
  await catalogos.click()
  await expect(page).toHaveURL(/\/configuracion\/repuestos\/catalogos$/)
  await expect(page.getByRole('heading', { name: 'Catálogos', level: 1 })).toBeVisible()
  await expect(
    page.getByText('Tipo de pieza, condición, vía de transporte y país de origen.'),
  ).toBeVisible()
  await expect(catalogos).toHaveAttribute('aria-current', 'page')
  for (const catalogo of ['Tipo de pieza', 'Condición', 'Vía de transporte', 'País de origen']) {
    await expect(page.getByRole('heading', { name: catalogo, level: 2 })).toBeVisible()
  }
  // Una pestaña ajena escrita a mano en la URL abre la misma; la vieja `?seccion=cotizador` llega al cotizador con el modal que pedía.
  await page.goto('/configuracion/repuestos?seccion=basura')
  await expect(page).toHaveURL(/\/configuracion\/repuestos\/catalogos$/)
  await page.goto('/configuracion/repuestos?seccion=cotizador&panel=tramo&tramo=nuevo&moneda=USD')
  await expect(page).toHaveURL(/\/configuracion\/repuestos\/cotizador\?panel=tramo/)
  await expect(page.getByRole('dialog', { name: 'Agregar tramo en USD' })).toBeVisible()

  await page.goto('/configuracion/inicio')
  // El hub es el `main`: el menú del marco tiene su entrada «Repuestos» aparte.
  await expect(
    page
      .getByRole('main')
      .getByRole('region')
      .getByRole('link', { name: /^Repuestos/ }),
  ).toBeVisible()
})

test('agregar, renombrar, desactivar y eliminar un tipo de pieza', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/repuestos/catalogos')
  const bloque = page.locator('section[aria-labelledby="titulo-de-catalogo-tipo_pieza"]')
  const agregar = page.getByRole('dialog', { name: 'Agregar tipo de pieza' })

  await bloque.getByRole('button', { name: 'Agregar tipo de pieza' }).click()
  await agregar.getByLabel('Nombre').fill(NOMBRE)
  await agregar.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(agregar).toBeHidden()
  await expect(filaDeCatalogo(page, NOMBRE)).toBeVisible()

  // Un nombre repetido lo dice la base junto al campo y no crea nada.
  await bloque.getByRole('button', { name: 'Agregar tipo de pieza' }).click()
  await agregar.getByLabel('Nombre').fill(NOMBRE)
  await agregar.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(agregar.getByText('Ya hay uno con ese nombre.')).toBeVisible()
  // Con algo escrito, cancelar pregunta antes de tirarlo.
  await agregar.getByRole('button', { name: 'Cancelar' }).click()
  await agregar.getByRole('button', { name: 'Descartar' }).click()
  await expect(agregar).toBeHidden()
  await expect(nombreDeLaFila(page, NOMBRE)).toHaveCount(1)

  // Renombrar.
  const renombrado = `${NOMBRE} 2`
  await nombreDeLaFila(page, NOMBRE).click()
  const editar = page.getByRole('dialog', { name: 'Editar tipo de pieza' })
  await editar.getByLabel('Nombre').fill(renombrado)
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(nombreDeLaFila(page, renombrado)).toBeVisible()

  // Desactivar: se sigue nombrando, con «Desactivado».
  await alternarActivo(page, renombrado)
  await expect(filaDeCatalogo(page, renombrado).getByText('Desactivado')).toBeVisible()

  // Eliminar: el diálogo lo nombra y, al confirmar, desaparece.
  await elegirDelMenu(page, renombrado, 'Eliminar')
  const eliminar = page.getByRole('dialog', { name: `Eliminar «${renombrado}»` })
  await expect(eliminar).toBeVisible()
  await eliminar.getByRole('button', { name: 'Eliminar' }).click()
  await expect(eliminar).toBeHidden()
  await expect(nombreDeLaFila(page, renombrado)).toHaveCount(0)
})

test('la asesora de la semilla no entra a Configuración › Repuestos', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/repuestos')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tipo de pieza' })).toHaveCount(0)
  await page.goto('/configuracion/repuestos/cotizador')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})
