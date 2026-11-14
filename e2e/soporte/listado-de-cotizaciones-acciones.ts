// El terreno del listado `/cotizaciones` con buscador y acciones (T15): el de «Marcar final» (la dueña, Ana «propios», quien sólo ve) más quien modera, un vehículo con título, VIN y lote
// propios, un cliente y tres preventas de la dueña sobre los dos, y una de Ana sin ninguno. Lo deshace `limpiarListadoDeAcciones()` (los lotes de la papelera antes que las personas).
import { CONTRASENA, entrar } from './alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { prepararFinal, sembrarParaMarcar, limpiarFinal } from './cotizaciones-final'
import { expect, type Locator, type Page } from './prueba'
import { literal, sql } from './sql'

export const TITULO_DEL_VEHICULO = 'Rav4 Mascota'
export const VIN = '1HGCM82633A004352'
export const LOTE = 'LOTE-77451'

// El origen de la prueba, para que las ayudas de abajo no lo pidan en cada llamada (un spec = un terreno).
let origenDeLaPrueba = ''

export type TerrenoDeLasAcciones = Awaited<ReturnType<typeof prepararListadoDeAcciones>>

export async function prepararListadoDeAcciones(proyecto: string) {
  const t = await prepararFinal(proyecto)
  origenDeLaPrueba = t.origen.id
  const moderadora = correoDePrueba(`mara-listado-acciones-${proyecto}`)
  await crearPersona({
    email: moderadora,
    contrasena: CONTRASENA,
    nombre: 'Mara Modera',
    invitada: true,
  })
  await darRolDePrueba({
    email: moderadora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Listado acciones modera`,
      clave: 'e2e_listado_acciones_modera',
    },
    permisos: [
      { clave: 'cotizaciones.ver', origenId: t.origen.id, alcance: 'todos' },
      'cotizaciones.moderar',
    ],
  })
  const sembradas = await sembrarParaMarcar(t, 'Acciones', { cuantas: 3 })
  const vehiculoId = sembradas.vehiculoId ?? ''
  sql(
    `update public.vehiculos set titulo = ${literal(`${TITULO_DEL_VEHICULO} ${proyecto}`)}, vin = ${literal(VIN)}, lote = ${literal(LOTE)} where id = ${literal(vehiculoId)}::uuid`,
  )
  const numeroDe = (id: string) =>
    sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)
  const [a = '', b = '', c = ''] = sembradas.ids.map(numeroDe)
  sembrarCotizaciones({ origenId: t.origen.id, creadoPor: idDePersona(t.ana), cuantas: 1 })
  return {
    t,
    moderadora,
    ids: sembradas.ids,
    // Las tres preventas de la dueña sobre el vehículo y el cliente, por número.
    numeros: [a, b, c] as [string, string, string],
    vehiculoId,
    nombreDelCliente: sql(
      `select nombre from public.leads where id = ${literal(sembradas.leadId)}::uuid`,
    ),
    nombreDeLaDuena: sql(`select nombre from public.perfiles where email = ${literal(t.duena)}`),
    // La de Ana, sin vehículo ni cliente.
    numeroDeAna: sql(
      `select numero from public.cotizaciones where creado_por = ${literal(idDePersona(t.ana))}::uuid and origen_id = ${literal(t.origen.id)}::uuid`,
    ),
  }
}

export async function limpiarListadoDeAcciones(): Promise<void> {
  sql(`delete from public.vistas_guardadas where nombre like 'E2E %'`)
  await limpiarFinal()
}

export const filas = (page: Page): Locator =>
  page.locator('tbody tr, li article').filter({ visible: true })
export const buscador = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Buscar por número, cliente, vehículo o autor' })
export const deLaPrueba = (): string => `/cotizaciones?origen=${origenDeLaPrueba}`

export async function irA(page: Page, correo: string, ruta: string): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(ruta)
}

// Busca por la URL (`?q=`), que es lo que escribe el campo, y espera la lista o el vacío.
export async function buscarPorUrl(page: Page, texto: string): Promise<void> {
  await page.goto(`${deLaPrueba()}&q=${encodeURIComponent(texto)}`)
  await expect(filas(page).or(page.getByText('Nada coincide con los filtros'))).not.toHaveCount(0)
}

export const numerosDeLasFilas = async (page: Page): Promise<string[]> =>
  (await filas(page).allInnerTexts()).map((texto) => /N\.º (\d+)/.exec(texto)?.[1] ?? '')

export async function menuDe(page: Page, numero: string): Promise<Locator> {
  await page.goto(`${deLaPrueba()}&q=${encodeURIComponent(`#${numero}`)}`)
  await expect(filas(page)).toHaveCount(1)
  await page
    .getByRole('button', { name: `Más acciones de N.º ${numero}` })
    .filter({ visible: true })
    .click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu
}

export async function cerrarElMenu(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
}

// Lo que el «⋯» ofrece, en el orden en que lo dibuja.
export const lineasDelMenu = async (menu: Locator): Promise<string[]> =>
  (await menu.getByRole('menuitem').allInnerTexts()).concat(
    await menu.getByRole('menuitemcheckbox').allInnerTexts(),
  )

export const marcasEnLaBase = (id: string): string =>
  sql(`
    select c.estado || ' · ' || (select count(*) from public.cotizaciones_reportes r where r.cotizacion_id = c.id)
           || ' · ' || exists(select 1 from public.cotizaciones_favoritos f where f.cotizacion_id = c.id)
      from public.cotizaciones c where c.id = ${literal(id)}::uuid`)
