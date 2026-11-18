import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  exigirBarraOrdenada,
  exigirMarcadorQueCabe,
  exigirPanelAlCostadoSoloSiCabe,
  type PiezaDeLaBarra,
} from './soporte/barra-de-filtros'
import { admin } from './soporte/base'
import { idDe } from './soporte/leads'
import { aLaVista, esMovil } from './soporte/inventario'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import {
  buscar,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { esperarHidratado } from './soporte/listas-por-pagina'
import {
  aLaVistaAlAcomodarse,
  capturar,
  sinScrollHorizontal,
  textoGrandeAlCargar,
} from './soporte/recorrido'
import { abrirVistaYOpciones, botonDeVistaYOpciones } from './soporte/vista-y-opciones'

// La barra del listado de leads (`<FilterShell>`) se lee en orden y desde la izquierda con el texto al 100 % y al 200 %, en escritorio y
// en el celular (cierre 5b, defecto 4.1: ningún botón queda solo en una fila si cabía en la anterior). El inventario de vehículos usa la misma barra: su spec está aparte
// (`barra-de-filtros-vehiculos-200.spec.ts`), porque preparar el inventario borra las cuentas de prueba.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Un lead de Berta con un nombre que cabe en los 16 rem de la columna del nombre.
  const { error } = await admin()
    .from('leads')
    .insert({
      nombre: `E2E Panel ${info.project.name}`,
      telefono_principal: `5917${info.project.name === 'movil' ? '83' : '82'}00001`,
      creado_por: await idDe(t.personas.berta),
    })
  expect(error).toBeNull()
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Las piezas de la barra de leads para Berta, en el orden del DOM: el buscador (crece), «Filtros» y «Vista y opciones», que agrupa la vista,
// el alcance, «Ítems por página», las vistas guardadas, importar y la papelera.
function piezasDeLeads(page: Page): PiezaDeLaBarra[] {
  return [
    { nombre: 'Buscar', lugar: aLaVista(page.getByPlaceholder('Nombre o número')) },
    {
      nombre: 'Filtros',
      lugar: aLaVista(page.getByRole('button', { name: 'Filtros', exact: true })),
    },
    { nombre: 'Vista y opciones', lugar: botonDeVistaYOpciones(page) },
  ]
}

for (const zoom of ['100', '200'] as const) {
  test(`la barra de leads al ${zoom} %: orden de lectura, desde la izquierda y sin botones solos`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irALeads(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const barra = page.locator('[data-barra-de-filtros]')
    await expect(barra).toBeVisible()
    const cajas = await exigirBarraOrdenada(page, barra, piezasDeLeads(page))
    await exigirMarcadorQueCabe(page.getByPlaceholder('Nombre o número'))
    await sinScrollHorizontal(page)
    const filas = new Set(cajas.map((c) => c.fila)).size
    info.annotations.push({ type: `filas de la barra al ${zoom} %`, description: String(filas) })
    await capturar(page, info, `barra-de-leads-${zoom}`)
    // «Vista y opciones» abierto: el panel cabe en la pantalla y la página no se ensancha.
    await abrirVistaYOpciones(page)
    await sinScrollHorizontal(page)
    await capturar(page, info, `vista-y-opciones-de-leads-${zoom}`)
  })
}

// El kanban (`?vista=embudo`) tiene su propia búsqueda: su marcador también cabe, y la página no se ensancha al 200 % (en el celular el
// campo, el título del embudo y el aviso se salían por la derecha).
for (const zoom of ['100', '200'] as const) {
  test(`el buscador del embudo al ${zoom} %: el marcador cabe y la página no se ensancha`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irAlEmbudo(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const campo = aLaVista(page.getByRole('searchbox', { name: 'Buscar en el embudo' }))
    await expect(campo).toBeVisible()
    await exigirMarcadorQueCabe(campo)
    await sinScrollHorizontal(page)
    await capturar(page, info, `buscador-del-embudo-${zoom}`)
  })
}

// La duda de las capturas de 5a-14: con el texto al 200 % el panel de filtros al costado dejaba 176 px a la lista y la fila salía cortada
// («Nom», «E2E», «N.º 5.»). El panel va al costado sólo si el contenedor mide 40 rem o más; si no, «Filtros» abre la hoja.
test('el listado de leads: el panel va al costado sólo si cabe, y al 200 % la fila se lee entera', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?q=E2E Panel')
  await exigirPanelAlCostadoSoloSiCabe(
    page,
    aLaVista(page.getByRole('link', { name: /^E2E Panel/ })),
  )
})

// 5a-23: el chip de una búsqueda larga («E2E Menu mas acciones», 22 letras) con el texto al 200 % desde la carga. Medía 403 px de ancho
// en una pantalla de 412 y la página llegaba a 435: el chip no se partía y empujaba la barra. Ahora se corta con «…» (el `title` dice
// el texto entero), cabe en la pantalla y su «×» queda a la vista.
const BUSQUEDA_LARGA = 'E2E Menu mas acciones'

test('una búsqueda de 22 letras al 200 %: el chip se corta con «…» y no ensancha la página', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page, t.personas.berta)
  await irALeads(page, buscar(BUSQUEDA_LARGA))
  const chip = aLaVista(page.getByRole('button', { name: `Quitar el filtro «${BUSQUEDA_LARGA}»` }))
  await expect(chip).toBeVisible()
  const texto = chip.locator('.truncate')
  // El listado llega pintado antes de hidratar y, un instante, más ancho que la pantalla: se mide ya hidratado.
  await esperarHidratado(page)
  await sinScrollHorizontal(page)
  await aLaVistaAlAcomodarse(chip, 'el chip de la búsqueda')
  await expect(texto).toHaveAttribute('title', `«${BUSQUEDA_LARGA}»`)
  if (esMovil(page)) {
    // En 412 px el chip no cabe entero: se corta, y el «×» (el último hijo del botón) sigue a la vista.
    expect(await texto.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true)
    await aLaVistaAlAcomodarse(chip.locator('svg'), 'la «×» del chip')
  }
})
