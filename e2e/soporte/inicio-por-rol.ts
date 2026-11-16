import type { Page } from '@playwright/test'
import { expect } from './prueba'
import { CONTRASENA, entrar } from './alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './base'
import { borrarDocumentos, sembrarDocumentos, type TerrenoDeDocumentos } from './documentos'
import { exigir } from './leads'
import { idDePersona } from './leads-alta'
import { darRolDeLaSemilla } from './rol-de-la-semilla'

// El terreno de `e2e/inicio-por-rol.spec.ts`: una persona por rol de referencia de `docs/UX.md` › Roles, lo que hace falta para que cada «Ver todas» exista
// (un recordatorio de hoy, una tarea sin fecha y una unidad demorada, trabada y con un documento por aprobar) y los títulos que cada una debe ver.

export const BLOQUES = {
  recordatorios: 'Recordatorios de hoy',
  sinSeguimiento: 'Leads sin seguimiento',
  turnos: 'Turnos de la web sin confirmar',
  trabados: 'Vehículos trabados',
  porAprobar: 'Documentos por aprobar',
  demoras: 'Alertas por demora',
  repuestosPorMover: 'Repuestos por mover',
  esperas: 'Esperas que destraban vehículos',
  tareas: 'Mis tareas',
  sinRol: 'Personas sin rol',
}

// La asesora de la semilla ve también la logística de lo suyo (`logistica.ver` «propios»): sus vehículos trabados y demorados.
export const DE_LA_ASESORA = [
  BLOQUES.recordatorios,
  BLOQUES.sinSeguimiento,
  BLOQUES.turnos,
  BLOQUES.trabados,
  BLOQUES.demoras,
  BLOQUES.tareas,
]
export const DE_LOGISTICA = [BLOQUES.trabados, BLOQUES.porAprobar, BLOQUES.demoras, BLOQUES.tareas]
export const DE_REPUESTOS = [BLOQUES.repuestosPorMover, BLOQUES.esperas, BLOQUES.tareas]
export const DEL_MIXTO = [
  BLOQUES.recordatorios,
  BLOQUES.sinSeguimiento,
  BLOQUES.turnos,
  BLOQUES.trabados,
  BLOQUES.porAprobar,
  BLOQUES.demoras,
  BLOQUES.tareas,
]
export const DE_LA_DUENA = Object.values(BLOQUES)

export const NOMBRE_SIN_ROL = 'Aaa Sin Rol Inicio'

export type Quien =
  'duena' | 'asesor' | 'logistica' | 'repuestos' | 'rrhh' | 'sinPermisos' | 'sinRol' | 'mixto'

export type TerrenoPorRol = {
  proyecto: string
  correo: Record<Quien, string>
  terreno: TerrenoDeDocumentos
  recordatorio: string
  tarea: string
}

const DIA = 86_400_000

// Los bloques que dibuja Inicio, en orden (cada uno es una `<section>` con su título).
export const titulos = (page: Page) => page.locator('main section > h2')

export async function ir(page: Page, correo: string): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeVisible()
}

export const sinBloquesCaidos = (page: Page) =>
  expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)

type Rol = { semillas: string[] } | { permisos: string[] } | null

async function crear(proyecto: string, quien: Quien, nombre: string, rol: Rol): Promise<string> {
  const email = correoDePrueba(`inicio-rol-${quien}-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  if (rol === null) return email
  if ('permisos' in rol) {
    await darRolDePrueba({
      email,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Inicio ${quien} ${proyecto}`,
        clave: `e2e_inicio_${quien.toLowerCase()}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
      },
      permisos: rol.permisos,
    })
    return email
  }
  const [principal = '', ...demas] = rol.semillas
  await darRolDeLaSemilla(email, principal)
  const cliente = admin()
  for (const clave of demas) {
    // Un rol más, no principal (`darRolDeLaSemilla` deja el principal).
    const perfil = await cliente
      .from('perfiles')
      .select('id')
      .eq('email', email)
      .single<{ id: string }>()
    const otro = await cliente
      .from('roles')
      .select('id')
      .eq('clave', clave)
      .single<{ id: string }>()
    exigir(perfil.error ?? otro.error, 'leer a la persona o su otro rol')
    exigir(
      (
        await cliente.from('usuarios_roles').insert({
          usuario_id: perfil.data?.id ?? '',
          rol_id: otro.data?.id ?? '',
          es_principal: false,
        })
      ).error,
      'darle el otro rol',
    )
  }
  return email
}

// Para la logística: una unidad demorada, trabada y con un documento por aprobar (como `inicio-bandeja-logistica.spec.ts`).
async function sembrarLaDemora(terreno: TerrenoDeDocumentos): Promise<void> {
  const cliente = admin()
  exigir(
    (await cliente.from('fases').update({ demora_dias: 1 }).eq('id', terreno.b.id)).error,
    'poner la demora de la fase B',
  )
  exigir(
    (
      await cliente
        .from('vehiculos')
        .update({ fase_desde: new Date(Date.now() - 3 * DIA).toISOString() })
        .eq('id', terreno.enB.id)
    ).error,
    'correr la entrada a la fase B',
  )
  exigir(
    (
      await cliente.from('documentos').insert({
        vehiculo_id: terreno.enB.id,
        tipo_documento_id: terreno.tipoDeBl.id,
        nombre_archivo: 'bl.pdf',
        mime: 'application/pdf',
      })
    ).error,
    'subir el BL',
  )
}

export async function prepararInicioPorRol(proyecto: string): Promise<TerrenoPorRol> {
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const duena = correoDePrueba(`inicio-rol-duena-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Inicio' })
  const terreno = await sembrarDocumentos(proyecto)
  const asesor = await crear(proyecto, 'asesor', 'Ada Asesora', { semillas: ['asesor'] })
  const logistica = await crear(proyecto, 'logistica', 'Lino Logística', {
    semillas: ['logistica'],
  })
  const repuestos = await crear(proyecto, 'repuestos', 'Rosa Repuestos', {
    semillas: ['repuestos'],
  })
  const rrhh = await crear(proyecto, 'rrhh', 'Hugo Equipo', {
    permisos: [
      'equipo.usuarios.ver',
      'equipo.usuarios.gestionar',
      'equipo.roles.ver',
      'equipo.roles.gestionar',
    ],
  })
  const sinPermisos = await crear(proyecto, 'sinPermisos', 'Sol Sinpermisos', {
    permisos: ['chat.participar'],
  })
  const mixto = await crear(proyecto, 'mixto', 'Mara Mixta', { semillas: ['asesor', 'logistica'] })
  // «Aaa»: queda primera por nombre, así entra en las cinco que muestra «Personas sin rol».
  const sinRol = await crear(proyecto, 'sinRol', NOMBRE_SIN_ROL, null)

  // Para que cada «Ver todas» de la asesora exista: un recordatorio de hoy y una tarea sin fecha.
  const cliente = admin()
  const asesora = await idDePersona(asesor)
  const nuevoRecordatorio = await cliente
    .from('recordatorios')
    .insert({
      usuario_id: asesora,
      titulo: `Recordar inicio por rol ${proyecto}`,
      recordar_en: new Date(Date.now() - 60_000).toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  exigir(nuevoRecordatorio.error, 'sembrar el recordatorio')
  const nuevaTarea = await cliente
    .from('tareas')
    .insert({
      titulo: `Tarea inicio por rol ${proyecto}`,
      creado_por: await idDePersona(duena),
      responsable_id: asesora,
    })
    .select('id')
    .single<{ id: string }>()
  exigir(nuevaTarea.error, 'sembrar la tarea')

  await sembrarLaDemora(terreno)
  return {
    proyecto,
    correo: { duena, asesor, logistica, repuestos, rrhh, sinPermisos, sinRol, mixto },
    terreno,
    recordatorio: nuevoRecordatorio.data?.id ?? '',
    tarea: nuevaTarea.data?.id ?? '',
  }
}

export async function limpiarInicioPorRol(t: TerrenoPorRol | undefined): Promise<void> {
  if (!t) return
  const cliente = admin()
  await cliente.from('recordatorios').delete().eq('id', t.recordatorio)
  await cliente.from('tareas').delete().eq('id', t.tarea)
  await borrarDocumentos(t.proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}
