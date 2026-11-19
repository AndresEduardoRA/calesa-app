import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  aLaVista,
  entrar as entrarAlInventario,
  esMovil,
  limpiarInventario,
  menuDeVehiculo,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { borrarFotosDe } from './soporte/fotos'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import {
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  PROPIO_BERTA,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { menuDelLead } from './soporte/leads-marcas'
import { irAlEmbudo, oportunidad, tarjeta, verEtapa } from './soporte/leads-oportunidades'
import {
  limpiarListadoDeAcciones,
  prepararListadoDeAcciones,
  type TerrenoDeLasAcciones,
} from './soporte/listado-de-cotizaciones-acciones'
import { esperarHidratado } from './soporte/listas-por-pagina'
import { capturar, recibeElClic } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { sembrarFotos } from './soporte/vehiculos-lista'

// Dónde va el «⋯» de cada ítem de una lista (`docs/UX.md` › «Reglas transversales», `<EsquinaDeAcciones>`): en la tarjeta, arriba a la
// derecha y a la vista sin pasar el mouse, de 44 px; en la tarjeta grande del inventario, sobre la foto, espejo de la casilla; en la
// tarjeta del kanban, también arriba a la derecha; en la tabla, en la columna pegada a la derecha, con sombra sólo mientras queda
// contenido detrás. Los proyectos de repuestos no tienen «⋯». Cada bloque prepara su terreno y lo deshace antes del siguiente (un
// solo worker: `playwright.config.ts`); es `serial` por dentro, y una caída en uno no deja sin correr a los otros.

type Caja = { x: number; y: number; ancho: number; alto: number }
// La caja de `lugar` (o la de su ancestro `desde`, p. ej. su esquina) y la de su contenedor (`hasta`), medidas en el mismo cuadro.
async function cajas(
  lugar: Locator,
  hasta: string,
  desde?: string,
): Promise<{ boton: Caja; de: Caja }> {
  await expect(lugar).toBeVisible()
  return lugar.evaluate(
    (e, [selector, inicio]) => {
      const medir = (n: Element) => {
        const r = n.getBoundingClientRect()
        return { x: r.left, y: r.top, ancho: r.width, alto: r.height }
      }
      const propio = inicio ? e.closest(inicio) : e
      const contenedor = propio?.parentElement?.closest(selector)
      if (!propio || !contenedor) throw new Error(`sin ${inicio ?? 'caja'} o sin ${selector}`)
      return { boton: medir(propio), de: medir(contenedor) }
    },
    [hasta, desde] as const,
  )
}

// Pegado a la esquina superior derecha (o izquierda) de su contenedor: a lo sumo 8 px (el relleno de la esquina y el borde).
function enLaEsquina(
  { boton, de }: { boton: Caja; de: Caja },
  que: string,
  lado: 'derecha' | 'izquierda' = 'derecha',
) {
  expect(boton.y - de.y, `${que}: arriba`).toBeLessThanOrEqual(8)
  expect(boton.y - de.y, `${que}: adentro por arriba`).toBeGreaterThanOrEqual(0)
  const alBorde = lado === 'derecha' ? de.x + de.ancho - (boton.x + boton.ancho) : boton.x - de.x
  expect(alBorde, `${que}: a la ${lado}`).toBeLessThanOrEqual(8)
  expect(alBorde, `${que}: adentro por la ${lado}`).toBeGreaterThanOrEqual(0)
}

function mide44(caja: Caja, que: string) {
  expect(Math.round(caja.ancho), `${que}: ancho`).toBe(44)
  expect(Math.round(caja.alto), `${que}: alto`).toBe(44)
}

// La celda pegada del «⋯» lleva la sombra de lo que pasa por detrás (su `::before` existe) o no.
const conSombra = (boton: Locator) =>
  boton.evaluate((e) => {
    const celda = e.closest('td')
    if (!celda) throw new Error('el «⋯» no está en una celda')
    const antes = getComputedStyle(celda, '::before')
    return antes.content !== 'none' && antes.width !== '0px'
  })

const contenedorDeLaTabla = (page: Page) =>
  aLaVista(page.locator('[data-slot="table-container"]')).first()

async function desplazar(page: Page, hasta: 'inicio' | 'mitad' | 'final'): Promise<void> {
  await contenedorDeLaTabla(page).evaluate((el, a) => {
    const maximo = el.scrollWidth - el.clientWidth
    el.scrollLeft = a === 'inicio' ? 0 : a === 'mitad' ? Math.round(maximo / 2) : el.scrollWidth
  }, hasta)
}

// En la tabla: el «⋯» pegado al borde derecho visible, recibe el clic, y la sombra sólo mientras queda contenido detrás.
async function columnaPegada(page: Page, boton: Locator, que: string): Promise<void> {
  const contenedor = contenedorDeLaTabla(page)
  const desborde = await contenedor.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(desborde, `${que}: la tabla se desplaza de costado`).toBeGreaterThan(0)
  for (const a of ['inicio', 'mitad', 'final'] as const) {
    await desplazar(page, a)
    const { boton: caja, de } = await cajas(boton, '[data-slot="table-container"]')
    const alBorde = de.x + de.ancho - (caja.x + caja.ancho)
    expect(alBorde, `${que} (${a}): al borde`).toBeLessThanOrEqual(12)
    await recibeElClic(boton)
    await expect
      .poll(() => conSombra(boton), { message: `${que} (${a}): sombra` })
      .toBe(a !== 'final')
  }
}

// Abre el «⋯» y lo cierra con Esc: el menú se va y el foco vuelve al botón.
async function focoVuelve(page: Page, boton: Locator): Promise<void> {
  await boton.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(boton).toBeFocused()
}

test.describe('leads y su kanban', () => {
  test.describe.configure({ mode: 'serial' })

  let t: TerrenoDelListado

  test.beforeAll(async ({}, info) => {
    t = await prepararListado(info.project.name)
  })

  test.afterAll(async () => {
    sql(
      `delete from public.repuestos_proyectos where vehiculo_etiqueta like 'E2E Menú de la fila%'`,
    )
    await limpiarListado(t)
  })

  test('E2E el «⋯» de un lead: arriba a la derecha de la tarjeta, o pegado a la derecha de la tabla con su sombra', async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    if (!esMovil(page)) await page.setViewportSize({ width: 900, height: 800 })
    await irALeads(page)
    await esperarHidratado(page)
    const boton = menuDelLead(page, nombre(PROPIO_BERTA))
    await expect(boton).toBeVisible()
    await capturar(page, info, 'leads')
    if (esMovil(page)) {
      const medidas = await cajas(boton, 'article')
      enLaEsquina(medidas, 'tarjeta del lead')
      mide44(medidas.boton, 'el «⋯» de la tarjeta')
      await focoVuelve(page, boton)
      await page.emulateMedia({ colorScheme: 'dark' })
      await capturar(page, info, 'leads-oscuro')
      return
    }
    await desplazar(page, 'mitad')
    await capturar(page, info, 'leads-tabla-a-mitad')
    await desplazar(page, 'final')
    await capturar(page, info, 'leads-tabla-al-final')
    await page.emulateMedia({ colorScheme: 'dark' })
    await desplazar(page, 'mitad')
    await capturar(page, info, 'leads-tabla-a-mitad-oscuro')
    await page.emulateMedia({ colorScheme: 'light' })
    await columnaPegada(page, boton, 'tabla de leads')
  })

  test('E2E el «⋯» de la tarjeta del kanban va arriba a la derecha, y el foco vuelve a él', async ({
    page,
  }, info) => {
    const lead = await nuevoLead({
      corto: `Menu Kanban ${info.project.name}`,
      telefono: completoCon(t, nacional()),
      deQuien: t.personas.berta,
    })
    const titulo = `Kanban del menú ${info.project.name}`
    await oportunidad(t.personas.berta, lead.id, { titulo, monto_estimado: 18000 })
    await entrar(page, t.personas.berta)
    await irAlEmbudo(page)
    await verEtapa(page, 'Nuevo')
    const boton = tarjeta(page, titulo).getByRole('button', {
      name: `Más acciones de ${lead.nombre}`,
      exact: true,
    })
    await expect(boton).toBeVisible()
    await capturar(page, info, 'kanban')
    const medidas = await cajas(boton, 'article')
    enLaEsquina(medidas, 'tarjeta del kanban')
    mide44(medidas.boton, 'el «⋯» del kanban')
    await expect(
      tarjeta(page, titulo).getByRole('button', { name: `Mover «${titulo}» a otra etapa` }),
    ).toBeVisible()
    await focoVuelve(page, boton)
  })

  test('E2E los proyectos de repuestos no tienen «⋯» ni columna de acciones', async ({
    page,
  }, info) => {
    const etiqueta = `E2E Menú de la fila ${info.project.name}`
    sql(`insert into public.repuestos_proyectos (vehiculo_etiqueta) values (${literal(etiqueta)})`)
    await entrar(page, t.personas.duena)
    await page.goto('/repuestos')
    await expect(aLaVista(page.getByText(etiqueta)).first()).toBeVisible()
    await expect(aLaVista(page.getByRole('button', { name: /^Más acciones de/ }))).toHaveCount(0)
    await capturar(page, info, 'repuestos')
  })
})

test.describe('vehículos', () => {
  test.describe.configure({ mode: 'serial' })

  let terreno: Terreno
  const CON_FOTO = 'MenuFila con foto'
  const SIN_FOTO = 'MenuFila sin foto'
  const ids: string[] = []

  test.beforeAll(async ({}, info) => {
    terreno = await prepararInventario(info.project.name, ['vehiculos.eliminar'])
    await cargarVehiculos(terreno.corea.id, [
      { titulo: CON_FOTO },
      { titulo: SIN_FOTO },
      // Las que alargan la tabla para que tenga qué desplazar.
      ...Array.from({ length: 3 }, (_, i) => ({ titulo: `MenuFila relleno ${String(i + 1)}` })),
    ])
    const conFoto = await vehiculoPorTitulo(CON_FOTO)
    if (!conFoto) throw new Error('falta el vehículo con foto')
    ids.push(conFoto.id)
    await sembrarFotos(conFoto.id, 1)
  })

  test.afterAll(async () => {
    await borrarFotosDe(ids)
    await limpiarInventario()
  })

  test('E2E en la tarjeta grande el «⋯» va sobre la foto, espejo de la casilla, con foto y sin ella', async ({
    page,
  }, info) => {
    test.skip(esMovil(page), 'La tarjeta grande es del escritorio: el celular dibuja la compacta.')
    await entrarAlInventario(page, terreno.duena)
    await page.goto(`/vehiculos?origen=${terreno.corea.id}&vista=tarjetas&q=MenuFila`)
    await esperarHidratado(page)
    await expect(menuDeVehiculo(page, SIN_FOTO)).toBeVisible()
    await capturar(page, info, 'vehiculos-tarjetas-grandes')
    await page.emulateMedia({ colorScheme: 'dark' })
    await capturar(page, info, 'vehiculos-tarjetas-grandes-oscuro')
    await page.emulateMedia({ colorScheme: 'light' })
    for (const titulo of [CON_FOTO, SIN_FOTO]) {
      const boton = menuDeVehiculo(page, titulo)
      // Centrado: abajo lo taparía la burbuja del chat, y fuera de la vista nadie recibe el clic.
      await boton.evaluate((e) => {
        e.scrollIntoView({ block: 'center' })
      })
      await capturar(page, info, `vehiculo-${titulo === CON_FOTO ? 'con' : 'sin'}-foto`)
      const casilla = aLaVista(page.getByRole('checkbox', { name: `Seleccionar ${titulo}` }))
      // La foto es el contenedor `relative` de las dos esquinas.
      const esquinaDelMenu = await cajas(boton, '.relative', '[data-no-abre]')
      const esquinaDeLaCasilla = await cajas(casilla, '.relative', '[data-no-abre]')
      enLaEsquina(esquinaDelMenu, `${titulo}: el «⋯» sobre la foto`)
      enLaEsquina(esquinaDeLaCasilla, `${titulo}: la casilla sobre la foto`, 'izquierda')
      expect(esquinaDelMenu.boton.ancho).toBeCloseTo(esquinaDeLaCasilla.boton.ancho, 0)
      expect(esquinaDelMenu.boton.alto).toBeCloseTo(esquinaDeLaCasilla.boton.alto, 0)
      mide44((await cajas(boton, 'article')).boton, `${titulo}: el «⋯»`)
      // La foto ocupa todo el ancho de la tarjeta: ninguna columna al costado.
      const { boton: foto, de: articulo } = await cajas(boton, 'article', '.relative')
      const sobra = articulo.ancho - foto.ancho
      expect(sobra, `${titulo}: la foto a todo el ancho`).toBeLessThanOrEqual(26)
      await recibeElClic(boton)
    }
    await focoVuelve(page, menuDeVehiculo(page, CON_FOTO))
  })

  test('E2E el «⋯» de un vehículo: sobre la foto de la tarjeta, o pegado a la derecha de la tabla', async ({
    page,
  }, info) => {
    await entrarAlInventario(page, terreno.duena)
    if (!esMovil(page)) await page.setViewportSize({ width: 900, height: 800 })
    await page.goto(`/vehiculos?origen=${terreno.corea.id}&vista=tabla&q=MenuFila`)
    await esperarHidratado(page)
    const boton = menuDeVehiculo(page, CON_FOTO)
    await expect(boton).toBeVisible()
    await capturar(page, info, 'vehiculos')
    if (esMovil(page)) {
      // En el celular la tabla es la tarjeta de la lista: el «⋯» va sobre su foto, como en la vista de tarjetas.
      enLaEsquina(
        await cajas(boton, '.relative', '[data-no-abre]'),
        'el «⋯» sobre la foto de la tarjeta',
      )
      mide44((await cajas(boton, 'article')).boton, 'el «⋯» de la tarjeta')
      return
    }
    await columnaPegada(page, boton, 'tabla de vehículos')
  })
})

test.describe('cotizaciones', () => {
  test.describe.configure({ mode: 'serial' })

  let terreno: TerrenoDeLasAcciones

  test.beforeAll(async ({}, info) => {
    terreno = await prepararListadoDeAcciones(info.project.name)
  })

  test.afterAll(async () => {
    await limpiarListadoDeAcciones()
  })

  test('E2E el «⋯» de una cotización: arriba a la derecha de la tarjeta, o pegado a la derecha de la tabla', async ({
    page,
  }, info) => {
    await entrar(page, terreno.t.duena, { fresco: true })
    if (!esMovil(page)) await page.setViewportSize({ width: 900, height: 800 })
    await page.goto('/cotizaciones?vista=tabla&agrupar=no') // en escritorio, la tabla: la lista nace en tarjetas (T319)
    const boton = aLaVista(
      page.getByRole('button', { name: `Más acciones de N.º ${terreno.numeros[0]}`, exact: true }),
    )
    await expect(boton).toBeVisible()
    await capturar(page, info, 'cotizaciones')
    if (esMovil(page)) {
      // El «⋯» va sobre la portada (el contenedor `relative`), como el del inventario sobre la foto.
      enLaEsquina(await cajas(boton, '.relative', '[data-no-abre]'), 'la portada de la tarjeta')
      mide44((await cajas(boton, 'article')).boton, 'el «⋯» de la tarjeta')
      return
    }
    await desplazar(page, 'mitad')
    await capturar(page, info, 'cotizaciones-tabla-a-mitad')
    await columnaPegada(page, boton, 'tabla de cotizaciones')
    // Con lugar de sobra la tabla entra entera: nada pasa por detrás de la columna y no hay sombra.
    await page.setViewportSize({ width: 2560, height: 900 })
    await expect
      .poll(() => contenedorDeLaTabla(page).evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeLessThanOrEqual(0)
    await expect.poll(() => conSombra(boton), { message: 'la tabla entra: sombra' }).toBe(false)
  })
})
