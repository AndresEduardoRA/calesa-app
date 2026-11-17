import { expect, test } from './soporte/prueba'
import {
  BLOQUES,
  DE_LA_ASESORA,
  DE_LA_DUENA,
  DE_LOGISTICA,
  DE_REPUESTOS,
  DEL_MIXTO,
  ir,
  limpiarInicioPorRol,
  NOMBRE_SIN_ROL,
  prepararInicioPorRol,
  sinBloquesCaidos,
  titulos,
  type TerrenoPorRol,
} from './soporte/inicio-por-rol'
import { idDePersona } from './soporte/leads-alta'

// Inicio (`/`) por rol: cada persona ve exactamente los bloques que le dan sus permisos, en el orden de `BLOQUES_BANDEJA`, y cada «Ver todas» lleva a la
// lista ya filtrada con la misma URL que produce el filtro. Los roles de referencia de `docs/UX.md` › Roles: asesor, logística y repuestos (los de la semilla),
// la dueña, RRHH (sólo `equipo.*`), alguien sin permisos, alguien sin rol y alguien con dos roles (asesor + logística: la unión, sin repetir).
test.describe.configure({ mode: 'serial' })

let t: TerrenoPorRol

test.beforeAll(async ({}, info) => {
  t = await prepararInicioPorRol(info.project.name)
})

test.afterAll(async () => {
  await limpiarInicioPorRol(t)
})

test.describe('asesor', () => {
  test('ve sus bloques, ninguno de equipo ni de repuestos, y cada «Ver todas» abre la agenda ya filtrada', async ({
    page,
  }) => {
    await ir(page, t.correo.asesor)
    await expect(titulos(page)).toHaveText(DE_LA_ASESORA)
    await sinBloquesCaidos(page)
    await expect(page.getByRole('link', { name: 'Ver el tablero' })).toHaveCount(0)

    const recordatorios = page.getByRole('region', { name: BLOQUES.recordatorios })
    await expect(recordatorios.getByText(`Recordar inicio por rol ${t.proyecto}`)).toBeVisible()
    await expect(recordatorios.getByText('1 recordatorio')).toBeVisible()
    await expect(recordatorios.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/agenda?ver=recordatorio',
    )
    await recordatorios.getByRole('link', { name: 'Ver todas' }).click()
    await expect(page).toHaveURL(/\/agenda\?ver=recordatorio$/)
    const queVer = page.getByRole('list', { name: 'Qué ver' })
    await expect(queVer.getByRole('button', { name: 'Recordatorio' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(queVer.getByRole('button', { name: 'Tarea' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await page.goto('/')
    const tareas = page.getByRole('region', { name: BLOQUES.tareas })
    await expect(
      tareas.getByRole('link', { name: new RegExp(`Tarea inicio por rol ${t.proyecto}`) }),
    ).toBeVisible()
    await expect(tareas.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/agenda?ver=tarea',
    )
    await tareas.getByRole('link', { name: 'Ver todas' }).click()
    await expect(page).toHaveURL(/\/agenda\?ver=tarea$/)
    await expect(
      page.getByRole('list', { name: 'Qué ver' }).getByRole('button', { name: 'Tarea' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByRole('list', { name: 'Qué ver' }).getByRole('button', { name: 'Recordatorio' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('logística', () => {
  test('ve vehículos trabados, documentos por aprobar y demoras, y cada «Ver todas» abre su grupo', async ({
    page,
  }) => {
    await ir(page, t.correo.logistica)
    await expect(titulos(page)).toHaveText(DE_LOGISTICA)
    await sinBloquesCaidos(page)

    const grupos: [string, string, string][] = [
      [BLOQUES.trabados, '/logistica/bandeja/trabados', 'Trabados'],
      [BLOQUES.porAprobar, '/logistica/bandeja/por-aprobar', 'Documentos por aprobar'],
      [BLOQUES.demoras, '/logistica/bandeja/demorados', 'Demorados'],
    ]
    for (const [bloque, ruta, titulo] of grupos) {
      await page.goto('/')
      const region = page.getByRole('region', { name: bloque })
      await expect(
        region.getByRole('link', { name: new RegExp(t.terreno.enB.titulo) }),
      ).toBeVisible()
      await expect(region.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', ruta)
      await region.getByRole('link', { name: 'Ver todas' }).click()
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
      await expect(
        page.getByRole('link', { name: t.terreno.enB.titulo, exact: true }),
      ).toBeVisible()
    }
  })
})

test.describe('repuestos', () => {
  test('ve ítems por mover y esperas, y ninguno de leads ni de documentos', async ({ page }) => {
    await ir(page, t.correo.repuestos)
    await expect(titulos(page)).toHaveText(DE_REPUESTOS)
    await sinBloquesCaidos(page)
    // «Ver todas» (si el bloque tiene filas) lleva a la Cadena de repuestos; la fila, al panel del ítem (`e2e/inicio-repuestos.spec.ts`).
    for (const bloque of [BLOQUES.repuestosPorMover, BLOQUES.esperas]) {
      const todas = page
        .getByRole('region', { name: bloque })
        .getByRole('link', { name: 'Ver todas' })
      if ((await todas.count()) > 0) {
        await expect(todas).toHaveAttribute('href', '/repuestos?vista=cadena')
      }
    }
  })
})

test.describe('dueña', () => {
  test('ve todos los bloques por su suma de permisos y «Ver el tablero»', async ({ page }) => {
    await ir(page, t.correo.duena)
    await expect(titulos(page)).toHaveText(DE_LA_DUENA)
    await sinBloquesCaidos(page)
    const personas = page.getByRole('region', { name: BLOQUES.sinRol })
    await expect(personas.getByRole('link', { name: NOMBRE_SIN_ROL })).toBeVisible()
    await page.getByRole('link', { name: 'Ver el tablero' }).click()
    await expect(page).toHaveURL(/\/tablero/)
  })
})

test.describe('RRHH', () => {
  test('ve sólo «Personas sin rol» y abre a la persona', async ({ page }) => {
    await ir(page, t.correo.rrhh)
    await expect(titulos(page)).toHaveText([BLOQUES.sinRol])
    await sinBloquesCaidos(page)
    await expect(page.getByRole('link', { name: 'Ver el tablero' })).toHaveCount(0)
    const personaId = await idDePersona(t.correo.sinRol)
    await page
      .getByRole('region', { name: BLOQUES.sinRol })
      .getByRole('link', { name: NOMBRE_SIN_ROL })
      .click()
    await expect(page).toHaveURL(new RegExp(`/configuracion/equipo\\?persona=${personaId}`))
  })
})

test.describe('sin permisos', () => {
  test('no ve ningún bloque: un vacío que dice qué hay y a quién pedir acceso, sin nada caído', async ({
    page,
  }) => {
    await ir(page, t.correo.sinPermisos)
    await expect(titulos(page)).toHaveCount(0)
    await sinBloquesCaidos(page)
    await expect(page.getByText('Tu rol todavía no tiene trabajo en la bandeja')).toBeVisible()
    await expect(page.getByText(/Acá aparecen recordatorios de hoy,/)).toBeVisible()
    await expect(page.getByText(/pídeselo a quien administra el equipo/)).toBeVisible()
  })
})

test.describe('sin rol', () => {
  test('dice que aún no tiene un rol y a quién avisar', async ({ page }) => {
    await ir(page, t.correo.sinRol)
    await expect(titulos(page)).toHaveCount(0)
    await expect(page.getByText('Aún no tienes un rol, avisa al dueño')).toBeVisible()
  })
})

test.describe('mixto (asesor + logística)', () => {
  test('ve la unión de los dos, sin repetir y en el orden de la bandeja', async ({ page }) => {
    await ir(page, t.correo.mixto)
    await expect(titulos(page)).toHaveText(DEL_MIXTO)
    await sinBloquesCaidos(page)
    await expect(page.getByRole('region', { name: BLOQUES.trabados })).toHaveCount(1)
  })
})
