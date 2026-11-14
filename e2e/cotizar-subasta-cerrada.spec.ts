import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  COPART,
  fallo,
  ficha,
  fijarApibara,
  leerApibara,
  restaurarApibara,
  simularApibara,
  type EstadoDeApibara,
  type Respuesta,
} from './soporte/apibara'
import {
  admin,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { crearOrigenDeSubastaDeCotizar } from './soporte/cotizar-formula'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// El aviso de la hoja de cotizar cuando la subasta del vehículo elegido ya cerró (`docs/UX.md` › «Cotizar»): dice cuándo cerró y su situación real y ofrece
// «Refrescar la subasta» (pide un toque: gasta cuota), «La ganamos» / «No la ganamos», «Elegir otro vehículo» y «Cotizar igual». No bloquea. En el panel del
// vehículo, la fila de una subasta cerrada se marca. apibara se intercepta: ningún e2e llama a la real.
test.describe.configure({ mode: 'serial' })

const AUCTION = COPART['auction'] as Record<string, unknown>
const HORA = 3_600_000
const DIA = 24 * HORA

let duena = ''
let sinPoder = ''
let origen = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara | undefined
const vehiculos: Record<string, string> = {}

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

// Un origen de subasta con «Subasta» (inicial, la subasta) → «Comprado», y vehículos en cada situación.
async function sembrar(): Promise<void> {
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen.id)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo')
  const fases = await cliente
    .from('fases')
    .insert([
      { flujo_id: flujo.data?.id, nombre: 'Subasta', orden: 1, es_inicial: true, es_subasta: true },
      {
        flujo_id: flujo.data?.id,
        nombre: 'Comprado',
        orden: 2,
        es_inicial: false,
        es_subasta: false,
      },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(fases.error, 'crear las fases')
  const fase = (nombre: string) => fases.data?.find((f) => f.nombre === nombre)?.id ?? ''
  const hace = (ms: number) => new Date(Date.now() - ms).toISOString()
  const en = (ms: number) => new Date(Date.now() + ms).toISOString()
  const filas = [
    // Cerrada y sin resolver, con un lote con el que preguntar a apibara.
    { clave: 'cerrada', estado: 'terminada', fecha: hace(2 * DIA), lote: '58540656' },
    // Cerrada sin resolver: «La ganamos» y «No la ganamos».
    { clave: 'resolver', estado: 'terminada', fecha: hace(3 * DIA), lote: '58540657' },
    // Sin resolver y sin permiso para resolverla.
    { clave: 'permisos', estado: 'terminada', fecha: hace(2 * DIA), lote: '58540658' },
    // Cerró hace una hora siendo «abierta»: la fila del panel «Cierre subasta» la marca.
    { clave: 'reciente', estado: 'abierta', fecha: hace(HORA), lote: null },
    // Todavía viva: ni aviso ni marca.
    { clave: 'viva', estado: 'abierta', fecha: en(3 * DIA), lote: null },
    // Terminada sin fecha: el aviso lo dice sin fecha.
    { clave: 'sinfecha', estado: 'terminada', fecha: null, lote: null },
  ]
  const creados = await cliente
    .from('vehiculos')
    .insert(
      filas.map((f) => ({
        origen_id: origen.id,
        titulo: `Cerrada ${f.clave}`,
        fase_id: fase('Subasta'),
        fase_desde: hace(5 * DIA),
        estado_subasta: f.estado,
        subasta_en: f.fecha,
        lote: f.lote,
      })),
    )
    .select('id, titulo')
    .returns<{ id: string; titulo: string }[]>()
  exigir(creados.error, 'cargar los vehículos')
  for (const f of filas) {
    vehiculos[f.clave] = creados.data?.find((c) => c.titulo === `Cerrada ${f.clave}`)?.id ?? ''
  }
  // Uno que ya se ganó y salió de la subasta: cotizarlo es lo normal.
  const ganado = await cliente
    .from('vehiculos')
    .insert({
      origen_id: origen.id,
      titulo: 'Cerrada ganado',
      fase_id: fase('Comprado'),
      fase_desde: hace(DIA),
      estado_subasta: 'terminada',
      subasta_en: hace(4 * DIA),
    })
    .select('id')
    .single<{ id: string }>()
  exigir(ganado.error, 'cargar el vehículo ganado')
  vehiculos['ganado'] = ganado.data?.id ?? ''
}

test.beforeAll(async ({}, info) => {
  await borrarRolesDePrueba()
  ;({ duena } = await prepararGuardado(info.project.name, 'subcerr'))
  origen = await crearOrigenDeSubastaDeCotizar(info.project.name, 'subcerrsub')
  await sembrar()
  // Ve los vehículos y cotiza, pero no los edita ni mueve de fase.
  sinPoder = correoDePrueba(`sinpoder-subcerr-${info.project.name}`)
  await crearPersona({
    email: sinPoder,
    contrasena: CONTRASENA,
    nombre: 'Sin Poder',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinPoder,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin poder`, clave: 'e2e_sin_poder_subasta_cerrada' },
    permisos: ['vehiculos.ver', 'cotizaciones.crear', 'cotizaciones.ver'],
  })
  apibaraAntes = await leerApibara()
  await fijarApibara(true)
})

test.afterAll(async () => {
  if (apibaraAntes) await restaurarApibara(apibaraAntes)
  // Los vehículos y las fases antes que el origen (retienen la fase).
  sql(`
    delete from public.vehiculos where origen_id = ${literal(origen.id)}::uuid;
    delete from public.fases_transiciones where flujo_id in (select id from public.flujos where origen_id = ${literal(origen.id)}::uuid);
    delete from public.fases where flujo_id in (select id from public.flujos where origen_id = ${literal(origen.id)}::uuid)`)
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const aviso = (page: Page): Locator => page.getByRole('region', { name: 'Subasta cerrada' })

async function abrir(page: Page, clave: string, quien = duena): Promise<void> {
  await entrar(page, quien, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&vehiculo=${vehiculos[clave] ?? ''}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

const situacionDe = (clave: string): string =>
  sql(`select situacion from public.vehiculos where id = ${literal(vehiculos[clave] ?? '')}::uuid`)

test('E2E el aviso dice cuándo cerró y su situación, y ofrece cada salida', async ({ page }) => {
  await abrir(page, 'cerrada')
  await expect(aviso(page)).toContainText('La subasta de este vehículo cerró el')
  await expect(aviso(page)).toContainText('Situación: Sin resolver.')
  for (const nombre of [
    'Refrescar la subasta',
    'No la ganamos',
    'Elegir otro vehículo',
    'Cotizar igual',
  ]) {
    await expect(aviso(page).getByRole('button', { name: nombre })).toBeVisible()
  }
  await expect(aviso(page).getByRole('link', { name: 'La ganamos' })).toHaveAttribute(
    'href',
    new RegExp(`/logistica/vehiculo/${vehiculos['cerrada'] ?? ''}\\?ganada=si`),
  )
  // No bloquea: la hoja sigue ahí con su botón de guardar.
  await expect(page.locator('[data-hoja]')).toBeVisible()
  // «Cotizar igual» lo cierra para esta hoja.
  await aviso(page).getByRole('button', { name: 'Cotizar igual' }).click()
  await expect(aviso(page)).toHaveCount(0)
})

test('E2E sin fecha el aviso lo dice sin fecha; uno vivo o ya ganado no avisa', async ({
  page,
}) => {
  await abrir(page, 'sinfecha')
  await expect(aviso(page)).toContainText('La subasta de este vehículo ya cerró.')
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&vehiculo=${vehiculos['viva'] ?? ''}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(aviso(page)).toHaveCount(0)
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&vehiculo=${vehiculos['ganado'] ?? ''}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(aviso(page)).toHaveCount(0)
})

test('E2E refrescar pide confirmar, dice el fallo con «Reintentar» y, si vuelve viva, el aviso se va', async ({
  page,
}) => {
  const cerrada: Respuesta = ficha(
    { ...COPART, auction: { ...AUCTION, state: 'closed', outcome_status: 'Not Sold' } },
    null,
  )
  const viva: Respuesta = ficha(
    {
      ...COPART,
      auction: {
        ...AUCTION,
        state: 'open',
        outcome_status: null,
        auction_at: new Date(Date.now() + 5 * DIA).toISOString(),
      },
    },
    null,
  )
  let respuesta: Respuesta = fallo('proveedor')
  await abrir(page, 'cerrada')
  const pedidos = await simularApibara(page, () => respuesta)

  await aviso(page).getByRole('button', { name: 'Refrescar la subasta' }).click()
  await expect(aviso(page)).toContainText('gasta cuota')
  // Hasta confirmar no se consulta.
  expect(pedidos).toHaveLength(0)
  await aviso(page).getByRole('button', { name: 'No, volver' }).click()
  await expect(aviso(page).getByRole('button', { name: 'Refrescar la subasta' })).toBeVisible()

  await aviso(page).getByRole('button', { name: 'Refrescar la subasta' }).click()
  await aviso(page).getByRole('button', { name: 'Sí, refrescar' }).click()
  await expect(aviso(page).getByRole('alert')).toBeVisible()
  await expect(aviso(page).getByRole('button', { name: 'Reintentar' })).toBeVisible()
  expect(pedidos).toHaveLength(1)

  // Sin cuota no se reintenta (gastaría otra consulta): se manda a Integraciones.
  respuesta = fallo('cuota')
  await aviso(page).getByRole('button', { name: 'Reintentar' }).click()
  await expect(aviso(page).getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
  await expect(aviso(page).getByRole('button', { name: 'Ir a Integraciones' })).toBeVisible()

  // La consulta vuelve y la subasta sigue cerrada: lo dice en el aviso.
  respuesta = cerrada
  await aviso(page).getByRole('button', { name: 'Refrescar la subasta' }).click()
  await aviso(page).getByRole('button', { name: 'Sí, refrescar' }).click()
  await expect(aviso(page)).toContainText('Consultada: la subasta sigue cerrada.')
  await expect(aviso(page)).toBeVisible()

  // Vuelve viva: la base la pasa a «En subasta» y el aviso desaparece.
  respuesta = viva
  await aviso(page).getByRole('button', { name: 'Refrescar la subasta' }).click()
  await aviso(page).getByRole('button', { name: 'Sí, refrescar' }).click()
  await expect(aviso(page)).toHaveCount(0)
  expect(situacionDe('cerrada')).toBe('en_subasta')
})

test('E2E «No la ganamos» deja la situación en el aviso y la quita de las salidas', async ({
  page,
}) => {
  await abrir(page, 'resolver')
  await aviso(page).getByRole('button', { name: 'No la ganamos' }).click()
  await expect(page.getByText('La marcaste como no ganada')).toBeVisible()
  await expect(aviso(page)).toContainText('Situación: No ganada.')
  expect(situacionDe('resolver')).toBe('no_ganada')
  await expect(aviso(page).getByRole('button', { name: 'No la ganamos' })).toHaveCount(0)
  await expect(aviso(page).getByRole('button', { name: 'Elegir otro vehículo' })).toBeVisible()
})

test('E2E «Elegir otro vehículo» abre el panel en «Cierre subasta» y marca la que cerró', async ({
  page,
}) => {
  await abrir(page, 'sinfecha')
  await aviso(page).getByRole('button', { name: 'Elegir otro vehículo' }).click()
  const panel = page.getByRole('dialog', { name: 'Vehículo' })
  await expect(panel).toBeVisible()
  await expect(page).toHaveURL(/panel=vehiculo/)
  await expect(page).toHaveURL(/lista=cierre/)
  await expect(panel.getByRole('tab', { name: 'Cierre subasta' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const filas = panel.getByRole('list', { name: 'Vehículos' }).getByRole('listitem')
  const cerrada = filas.filter({ hasText: 'Cerrada reciente' })
  await expect(cerrada).toContainText('Subasta cerrada')
  await expect(cerrada).toContainText('Cerró')
  const viva = filas.filter({ hasText: 'Cerrada viva' })
  await expect(viva).toContainText('Cierra')
  await expect(viva).not.toContainText('Subasta cerrada')
})

test('E2E sin permiso para refrescar ni resolver no hay esos botones y dice a quién pedirlo', async ({
  page,
}) => {
  await abrir(page, 'permisos', sinPoder)
  await expect(aviso(page)).toContainText('La subasta de este vehículo cerró el')
  await expect(aviso(page)).toContainText('pídeselo a quien administra los roles')
  await expect(aviso(page).getByRole('button', { name: 'Refrescar la subasta' })).toHaveCount(0)
  await expect(aviso(page).getByRole('button', { name: 'No la ganamos' })).toHaveCount(0)
  await expect(aviso(page).getByRole('link', { name: 'La ganamos' })).toHaveCount(0)
  await expect(aviso(page).getByRole('button', { name: 'Elegir otro vehículo' })).toBeVisible()
  await expect(aviso(page).getByRole('button', { name: 'Cotizar igual' })).toBeVisible()
})
