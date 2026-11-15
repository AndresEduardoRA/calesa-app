'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  accionesDeLaFila,
  rutaDeVerTodos,
  type AnclaDeLead,
  type ContextoDeAcciones,
  type LugarDeRelacionados,
  type ParaRelacionados,
} from '../../../entities/acciones-de-relacionados'
import type {
  FilaRelacionada,
  GrupoDeRelacionados,
  RelacionadosDelLead,
  VehiculoRelacionado,
} from '../../../entities/relacionados'
import { useAccionesDeRelacionados } from '../hooks/use-acciones-de-relacionados'
import { usePanelDeRelacionados } from '../hooks/use-panel-de-relacionados'
import { DrawerDeRelacionadosDiferido } from './diferidos'
import { FilaDeVehiculo } from './fila-de-vehiculo'
import { Relacionados } from './relacionados'

type Props = {
  datos: RelacionadosDelLead
  lugar: LugarDeRelacionados
  para: ParaRelacionados
  // El resumen lee en el navegador: tras una acción lograda vuelve a leer.
  alCambiar?: () => void
}

// El bloque «Relacionados» de un lead (sus vehículos): lo comparten la ficha del lead y su resumen del listado. Quitar interés y desvincular (con la cartera) se hacen en el lugar con «Deshacer»;
// vincular o marcar un vehículo y desvincular sin la cartera llevan a la sección «Vehículos» de la ficha, que tiene su panel con su búsqueda y su nota.
export function RelacionadosDeUnLead({ datos, lugar, para, alCambiar }: Props) {
  const ancla: AnclaDeLead = { lado: 'lead', leadId: datos.leadId, puedoActuar: datos.puedoActuar }
  const contexto: ContextoDeAcciones = { lugar, ancla, para }
  const acciones = useAccionesDeRelacionados(
    { lado: 'lead', leadId: datos.leadId },
    alCambiar ? { alCambiar } : {},
  )
  const verTodos = usePanelDeRelacionados()
  const ultimoTipo = useUltimo(verTodos.tipo)
  const montarVerTodos = useAbiertoAlgunaVez(verTodos.tipo !== null && lugar !== 'resumen')
  const filaDe = (fila: FilaRelacionada<VehiculoRelacionado>, clave: string) => (
    <FilaDeVehiculo
      key={clave}
      fila={fila}
      claveDelVisor={clave}
      acciones={accionesDeLaFila(fila, contexto)}
      enCurso={acciones.enCurso}
      alElegir={(accion) => {
        acciones.ejecutar(accion, fila)
      }}
    />
  )
  const claveDe = (fila: FilaRelacionada<VehiculoRelacionado>, tipo: string) =>
    `${tipo}-${fila.contraparte.vehiculoId}${fila.detalle.tipo === 'cotizado' ? `-${fila.detalle.cotizacion.id}` : ''}`
  return (
    <>
      <Relacionados
        grupos={datos.grupos}
        contexto={contexto}
        enCurso={acciones.enCurso}
        alElegir={(accion) => {
          acciones.ejecutar(accion, null)
        }}
        filasDe={(grupo: GrupoDeRelacionados<VehiculoRelacionado>) =>
          grupo.filas.map((fila) => filaDe(fila, claveDe(fila, grupo.tipo)))
        }
        verTodosDe={(grupo) => {
          if (!grupo.hayMas) {
            return null
          }
          return lugar === 'resumen'
            ? { href: rutaDeVerTodos(ancla, grupo.tipo) }
            : {
                abrir: () => {
                  verTodos.abrir(grupo.tipo)
                },
              }
        }}
      />
      {montarVerTodos && ultimoTipo !== null ? (
        <DrawerDeRelacionadosDiferido
          abierto={verTodos.tipo === ultimoTipo}
          alCerrar={verTodos.cerrar}
          lista={{ lado: 'lead', id: datos.leadId, tipo: ultimoTipo }}
          sustantivo="vehículos"
          filaDe={(fila) =>
            filaDe(
              fila as FilaRelacionada<VehiculoRelacionado>,
              claveDe(fila as FilaRelacionada<VehiculoRelacionado>, `todos-${ultimoTipo}`),
            )
          }
        />
      ) : null}
    </>
  )
}
