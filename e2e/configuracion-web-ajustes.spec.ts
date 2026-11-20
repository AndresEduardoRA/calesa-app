// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Locator } from './soporte/prueba'
import { admin } from './soporte/base'
import { editarTarjeta } from './soporte/empresa'
import { entrar, limpiarInventario, prepararInventario, type Terreno } from './soporte/inventario'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import {
  abrirVitrina,
  cerrarVitrina,
  crearFaseQuePublica,
  ponerEnFase,
  vitrinaPublica,
} from './soporte/vitrina'

// «Ajustes» de Configuración › Sitio web (8.01-4), en tarjetas con un modal cada una: guardar el lema y la dirección pública entrando por el hub, y
// apagar un origen desde «Vitrina» avisando cuántos vehículos publicados dejan de verse. El conflicto de versión y la validación los prueba
// `supabase/tests/areas/web/ajustes-guardar.sql`. `ajustes_web` es una fila que otros specs leen: se restaura al final (un solo worker).
test.describe.configure({ mode: 'serial' })

const CLAVE_DE_COREA = 'e2e_corea_inv'
const PUBLICADO = 'Ajustes Publicado'
const DIRECCION = 'https://autos-del-sur.example'
const LEMA = 'Del puerto a tu puerta'

type Guardado = {
  lema: string | null
  direccion_publica: string | null
  origenes_visibles: string[]
  // Guardar por la pantalla la pone a la dueña de prueba (FK a `perfiles`): sin restaurarla, su cuenta no se borra.
  actualizado_por: string | null
}

let duena = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let antes: Guardado | null = null

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, ['web.ajustes.gestionar'])
  ;({ duena, corea } = terreno)
  // Después de preparar: su limpieza ya soltó un autor de prueba que hubiera dejado una corrida cortada.
  antes = JSON.parse(
    sql(
      'select row_to_json(t) from (select lema, direccion_publica, origenes_visibles, actualizado_por from public.ajustes_web where id = 1) t',
    ),
  ) as Guardado
  await cargarVehiculos(corea.id, [{ titulo: PUBLICADO, anio: 2023 }])
  const id = (await vehiculoPorTitulo(PUBLICADO))?.id ?? ''
  await ponerEnFase(id, await crearFaseQuePublica(corea.id, 'En venta'))
  const { error } = await admin().from('vehiculos').update({ publicado_web: true }).eq('id', id)
  if (error) {
    throw new Error(`No se pudo publicar el vehículo: ${error.message}`)
  }
  await abrirVitrina([corea.id])
})

test.afterAll(async () => {
  await cerrarVitrina()
  if (antes) {
    const { error } = await admin().from('ajustes_web').update(antes).eq('id', 1)
    if (error) {
      throw new Error(`No se pudieron restaurar los ajustes de la web: ${error.message}`)
    }
  }
  await limpiarInventario()
})

const casillaDeCorea = (dialogo: Locator) =>
  dialogo.getByRole('checkbox', { name: corea.nombre, exact: true })

test('la dueña guarda el lema y la dirección pública desde el hub, y quedan guardados', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/inicio')
  await page
    .getByRole('main')
    .getByRole('region')
    .getByRole('link', { name: /^Sitio web/ })
    .click()
  // `/configuracion/web` abre la primera sub-sección que la dueña puede: Ajustes.
  await expect(page).toHaveURL(/\/configuracion\/web\/ajustes$/)
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()

  const identidad = await editarTarjeta(page, 'Identidad del sitio')
  await identidad.getByLabel('Lema', { exact: true }).fill(LEMA)
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes del sitio guardados')).toBeVisible()
  await expect(identidad).toBeHidden()

  const contacto = await editarTarjeta(page, 'Contacto')
  await contacto.getByLabel('Dirección pública', { exact: true }).fill(DIRECCION)
  await contacto.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(contacto).toBeHidden()
  expect(sql("select lema || '|' || direccion_publica from public.ajustes_web where id = 1")).toBe(
    `${LEMA}|${DIRECCION}`,
  )

  // La guardada de una tarjeta no pisa lo de otra: la tarjeta dice lo nuevo tras recargar.
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Identidad del sitio', exact: true }),
  ).toContainText(LEMA)
  await expect(page.getByRole('region', { name: 'Contacto', exact: true })).toContainText(
    'autos-del-sur.example',
  )
})

test('apagar un origen avisa cuántos vehículos publicados dejan de verse', async ({ page }) => {
  expect((await vitrinaPublica(CLAVE_DE_COREA)).map((fila) => fila.titulo)).toEqual([PUBLICADO])
  await entrar(page, duena)
  await page.goto('/configuracion/web')

  const vitrina = await editarTarjeta(page, 'Vitrina')
  await casillaDeCorea(vitrina).click()
  await expect(
    page.getByText(`Al guardar, deja de verse en la web 1 vehículo publicado de ${corea.nombre}.`),
  ).toBeVisible()
  await vitrina.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes del sitio guardados')).toBeVisible()
  expect(
    sql(
      `select ${literal(corea.id)}::uuid = any(origenes_visibles) from public.ajustes_web where id = 1`,
    ),
  ).toBe('f')
  expect(await vitrinaPublica(CLAVE_DE_COREA)).toEqual([])
})
