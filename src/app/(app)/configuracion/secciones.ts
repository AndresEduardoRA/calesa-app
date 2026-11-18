import {
  Building2Icon,
  ContactRoundIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { SECCION_DE_COLA_WEB } from './cola-web/seccion'
import { SECCION_DE_COTIZACION } from './cotizacion/seccion'
import { PERMISOS_DE_EMPRESA } from './empresa/pestanas'
import { SECCION_DE_FLUJOS } from './flujos/seccion'
import { PERMISOS_DE_LEADS } from './leads/pestanas'
import { SECCIONES_DE_LOGISTICA } from './logistica/seccion'
import { PERMISOS_DE_ORIGENES } from './origenes/acceso'
import { SECCION_DE_REPUESTOS } from './repuestos/seccion'
import { SECCIONES_DE_WEB } from './web/seccion'

// El registro de Configuración: la única fuente del inicio, del menú de Configuración y del selector de sección del celular. Cada
// sección se abre con cualquiera de sus permisos (ver o gestionar) y pertenece a un grupo; sus sub-secciones son las sub-rutas que
// registra cada página (se suman aquí, con su `page.tsx`). secciones.test.ts falla si una ruta o sub-ruta no tiene su `page.tsx`.

// Los grupos de Configuración, en el orden en que se dibujan. No: «área» (es otra cosa en el glosario).
export const GRUPOS = [
  { clave: 'empresa-y-equipo', titulo: 'Empresa y equipo' },
  { clave: 'ventas', titulo: 'Ventas' },
  { clave: 'operacion', titulo: 'Operación' },
  { clave: 'web', titulo: 'Web' },
] as const

export type GrupoDeConfiguracion = (typeof GRUPOS)[number]['clave']

export type SubseccionDeConfiguracion = {
  clave: string
  titulo: string
  // Empieza con la ruta de su sección y una barra.
  ruta: string
  permisos: readonly ClavePermiso[]
}

export type SeccionDeConfiguracion = {
  clave: string
  titulo: string
  // Una frase: qué se configura ahí.
  descripcion: string
  ruta: string
  Icono: LucideIcon
  permisos: readonly ClavePermiso[]
  grupo: GrupoDeConfiguracion
  subsecciones: readonly SubseccionDeConfiguracion[]
}

export const SECCIONES = [
  {
    clave: 'empresa',
    titulo: 'Empresa',
    descripcion: 'La marca, los datos legales, la región, las monedas y las integraciones.',
    ruta: RUTAS.empresa,
    Icono: Building2Icon,
    permisos: PERMISOS_DE_EMPRESA,
    grupo: 'empresa-y-equipo',
    subsecciones: [],
  },
  {
    clave: 'equipo',
    titulo: 'Equipo',
    descripcion: 'Las personas, sus roles, las invitaciones, el bloqueo y la baja.',
    ruta: RUTAS.equipo,
    Icono: UsersRoundIcon,
    permisos: ['equipo.usuarios.ver', 'equipo.usuarios.gestionar'],
    grupo: 'empresa-y-equipo',
    subsecciones: [],
  },
  {
    clave: 'roles',
    titulo: 'Roles y permisos',
    descripcion: 'Qué puede hacer cada rol, por origen y con qué alcance.',
    ruta: RUTAS.roles,
    Icono: ShieldCheckIcon,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
    grupo: 'empresa-y-equipo',
    subsecciones: [],
  },
  {
    clave: 'origenes',
    titulo: 'Orígenes',
    descripcion: 'De dónde vienen los vehículos: su layout de campos y sus categorías.',
    ruta: RUTAS.origenes,
    Icono: MapPinIcon,
    permisos: PERMISOS_DE_ORIGENES,
    grupo: 'ventas',
    subsecciones: [],
  },
  {
    clave: 'leads',
    titulo: 'Leads',
    descripcion:
      'Los campos, los orígenes y tipos de lead, los seguimientos, el embudo y el portal.',
    ruta: RUTAS.configuracionDeLeads,
    Icono: ContactRoundIcon,
    permisos: PERMISOS_DE_LEADS,
    grupo: 'ventas',
    subsecciones: [],
  },
  SECCION_DE_COTIZACION,
  SECCION_DE_FLUJOS,
  ...SECCIONES_DE_LOGISTICA,
  SECCION_DE_REPUESTOS,
  ...SECCIONES_DE_WEB,
  SECCION_DE_COLA_WEB,
] as const satisfies readonly SeccionDeConfiguracion[]

function puedeAbrir(permisos: Permisos, claves: readonly ClavePermiso[]): boolean {
  return claves.some((clave) => puede(permisos, clave))
}

// La sección con sólo las sub-secciones que la persona puede abrir.
export function conSubseccionesVisibles(
  seccion: SeccionDeConfiguracion,
  permisos: Permisos,
): SeccionDeConfiguracion {
  return {
    ...seccion,
    subsecciones: seccion.subsecciones.filter((sub) => puedeAbrir(permisos, sub.permisos)),
  }
}

// Las secciones que la persona puede abrir, cada una con sólo las sub-secciones que también puede abrir.
export function seccionesVisibles(permisos: Permisos): SeccionDeConfiguracion[] {
  return SECCIONES.filter((seccion: SeccionDeConfiguracion) =>
    puedeAbrir(permisos, seccion.permisos),
  ).map((seccion: SeccionDeConfiguracion) => conSubseccionesVisibles(seccion, permisos))
}

export type GrupoVisible = {
  clave: GrupoDeConfiguracion
  titulo: string
  secciones: SeccionDeConfiguracion[]
}

// Las secciones que la persona puede abrir, por grupo y en el orden de `GRUPOS`; un grupo sin ninguna no figura.
export function gruposVisibles(permisos: Permisos): GrupoVisible[] {
  const visibles = seccionesVisibles(permisos)
  return GRUPOS.map(({ clave, titulo }) => ({
    clave,
    titulo,
    secciones: visibles.filter((seccion) => seccion.grupo === clave),
  })).filter((grupo) => grupo.secciones.length > 0)
}

// Lo que el menú y el selector mandan al navegador: sólo lo que dibujan (sin el icono, que es una función, ni los permisos). Viaja en
// el HTML de cada página de Configuración.
export type GrupoDelNavegador = {
  clave: string
  titulo: string
  secciones: {
    clave: string
    titulo: string
    ruta: string
    subsecciones: { clave: string; titulo: string; ruta: string }[]
  }[]
}

export function paraElNavegador(grupos: readonly GrupoVisible[]): GrupoDelNavegador[] {
  return grupos.map((grupo) => ({
    clave: grupo.clave,
    titulo: grupo.titulo,
    secciones: grupo.secciones.map((seccion) => ({
      clave: seccion.clave,
      titulo: seccion.titulo,
      ruta: seccion.ruta,
      subsecciones: seccion.subsecciones.map(({ clave, titulo, ruta }) => ({
        clave,
        titulo,
        ruta,
      })),
    })),
  }))
}
