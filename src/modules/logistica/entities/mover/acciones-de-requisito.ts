// Qué destraba cada requisito que falta en «Qué falta» (`docs/GLOSARIO.md` › «Acción del requisito»), según su tipo (documento | dato | espera) y lo que quien
// mira puede: hacerlo ahí mismo, ir a donde se hace o pedírselo a quien puede. La resuelve la action de «Qué falta» en el servidor y viaja ya resuelta: ni
// `permisos.ts` ni esta regla van al navegador. La base vuelve a exigir cada cosa con sus RPC. Puro, sin I/O.
import { rutaDeLaUnidad } from '../nucleo/enlaces'
import {
  alHueco,
  armarAcciones,
  ir,
  revisar,
  subir,
  type AccionesDelRequisito,
  type PlanDelRequisito,
  type RequisitoQueFalta,
} from './accion-de-requisito'
import { planDeUnDato } from './acciones-de-un-dato'
import type { CapacidadesDeQueFalta } from './capacidades-de-que-falta'

export type DestinoQueFalta = { nombre: string; requisitos: readonly RequisitoQueFalta[] }

export type ContextoDeQueFalta = {
  unidad: { tipo: 'vehiculo' | 'repuesto'; id: string }
  capacidades: CapacidadesDeQueFalta
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

// Lo que el detalle de un documento cuenta (`evaluar_requisitos`): el tipo, si sobran aprobados (más que el máximo) y cuántos hay subidos por revisar.
function cuentaDelDocumento(r: RequisitoQueFalta) {
  const tipoId = r.detalle['tipo_documento_id']
  const max = numero(r.detalle['max'])
  return {
    tipoId: typeof tipoId === 'string' ? tipoId : null,
    sobran: max !== null && (numero(r.detalle['aprobados']) ?? 0) > max,
    porRevisar: numero(r.detalle['por_revisar']) ?? 0,
  }
}

// Documento: «Revisar» antes que «Subir» si ya hay uno subido que contaría (`por_revisar`); con más aprobados que el máximo, «Ir a Documentos» (sobra uno:
// se quita o se rechaza mirando la lista).
function planDeUnDocumento(r: RequisitoQueFalta, c: CapacidadesDeQueFalta): PlanDelRequisito {
  const { tipoId, sobran, porRevisar } = cuentaDelDocumento(r)
  const clave = c.tipo === 'vehiculo' ? 'logistica.documentos' : 'repuestos.documentos'
  if (tipoId === null || sobran) {
    const puede = c.subirDocumentos || c.aprobarDocumentos
    return {
      hacer: puede ? alHueco('documentos', r.etiqueta) : null,
      pedir: `${clave}.aprobar`,
      extras: [],
      hueco: 'documentos',
    }
  }
  const irADocumentos = c.veHueco.documentos && alHueco('documentos', r.etiqueta)
  const subirlo = c.subirDocumentos && subir(r.etiqueta, tipoId)
  if (porRevisar > 0) {
    return {
      hacer: c.aprobarDocumentos ? revisar(r.etiqueta, tipoId) : null,
      pedir: `${clave}.aprobar`,
      extras: [subirlo || irADocumentos],
      hueco: 'documentos',
    }
  }
  return {
    hacer: subirlo || null,
    pedir: `${clave}.subir`,
    extras: [irADocumentos],
    hueco: 'documentos',
  }
}

// Espera: el vehículo espera a sus ítems (`hijos`) se destraba en «Repuestos», moviéndolos; el ítem que espera a su vehículo (`padre`) sólo lo dice.
function planDeUnaEspera(r: RequisitoQueFalta, c: CapacidadesDeQueFalta): PlanDelRequisito {
  const padre = r.detalle['padre']
  if (typeof padre === 'string' || 'padre' in r.detalle) {
    return {
      hacer:
        typeof padre === 'string' && c.verLogistica
          ? ir('Ir al vehículo', `Ir al vehículo por «${r.etiqueta}»`, rutaDeLaUnidad(padre))
          : null,
      pedir: null,
      extras: [],
      hueco: null,
    }
  }
  const irARepuestos = alHueco('repuestos', r.etiqueta)
  if (c.verRepuestos && c.moverRepuestos) {
    return { hacer: irARepuestos, pedir: null, extras: [], hueco: 'repuestos' }
  }
  return {
    hacer: null,
    pedir: 'repuestos.mover',
    extras: [c.verRepuestos && irARepuestos],
    hueco: 'repuestos',
  }
}

function planDe(
  r: RequisitoQueFalta,
  { unidad, capacidades }: ContextoDeQueFalta,
): PlanDelRequisito | null {
  if (r.tipo === 'documento') return planDeUnDocumento(r, capacidades)
  if (r.tipo === 'espera') return planDeUnaEspera(r, capacidades)
  return planDeUnDato(r, capacidades, unidad.id)
}

/**
 * Las acciones de cada requisito que falta, por su id, en las tarjetas de destino. Un requisito cumplido o de una clave desconocida no trae nada. «Pedirlo»
 * sólo en un vehículo y con `agenda.tareas.asignar`; si no, «Pídeselo a quien administra los roles.».
 */
export function resolverAccionesDeQueFalta(
  destinos: readonly DestinoQueFalta[],
  contexto: ContextoDeQueFalta,
): Record<string, AccionesDelRequisito> {
  const { unidad, capacidades } = contexto
  const puedePedir = unidad.tipo === 'vehiculo' && capacidades.asignarTareas
  const acciones: Record<string, AccionesDelRequisito> = {}
  for (const destino of destinos) {
    for (const r of destino.requisitos) {
      if (r.cumplido) continue
      const plan = planDe(r, contexto)
      if (plan === null) continue
      acciones[r.requisitoId] = armarAcciones(r, plan, {
        fase: destino.nombre,
        puedePedir,
        veHueco: capacidades.veHueco,
      })
    }
  }
  return acciones
}
