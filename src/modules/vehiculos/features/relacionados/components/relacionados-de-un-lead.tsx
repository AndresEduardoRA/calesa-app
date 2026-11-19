'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  accionesDeLaFila,
  type AnclaDeLead,
  type ContextoDeAcciones,
  type LugarDeRelacionados,
  type ParaRelacionados,
} from '../../../entities/acciones-de-relacionados'
import {
  TEXTO_SIN_VEHICULOS,
  TITULO_DE_VEHICULOS_DEL_LEAD,
  type FilaRelacionada,
  type GrupoDeRelacionados,
  type PresentacionDeRelacionados,
  type RelacionadosDelLead,
  type VehiculoRelacionado,
} from '../../../entities/relacionados'
import { useAccionesDeRelacionados } from '../hooks/use-acciones-de-relacionados'
import { usePanelDeRelacionados } from '../hooks/use-panel-de-relacionados'
import { DrawerDeRelacionadosDiferido } from './diferidos'
import { FilaDeVehiculo } from './fila-de-vehiculo'
import { Relacionados } from './relacionados'
import { VincularOMarcar } from './vincular-o-marcar'

type Props = {
  datos: RelacionadosDelLead
  lugar: LugarDeRelacionados
  para: ParaRelacionados
  // La ficha, compacta.
  presentacion: PresentacionDeRelacionados
}

// El bloque «Vehículos» de la ficha del lead (su «Relacionados», con ese nombre en el título y en el índice). Quitar interés y desvincular (con la cartera)
// se hacen en el lugar con «Deshacer»; desvincular sin la cartera confirma en `?panel=desvincular`. Con la cartera y `leads.editar` (`puedoActuar`), el título
// lleva su única acción, «Vincular o marcar», que abre el panel de `GestionDelLead` (`?panel=agregar-vehiculo`).
export function RelacionadosDeUnLead({ datos, lugar, para, presentacion }: Props) {
  const ancla: AnclaDeLead = { lado: 'lead', leadId: datos.leadId, puedoActuar: datos.puedoActuar }
  const contexto: ContextoDeAcciones = { lugar, ancla, para }
  const acciones = useAccionesDeRelacionados({ lado: 'lead', leadId: datos.leadId })
  const verTodos = usePanelDeRelacionados()
  const ultimoTipo = useUltimo(verTodos.tipo)
  const montarVerTodos = useAbiertoAlgunaVez(verTodos.tipo !== null)
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
        presentacion={presentacion}
        encabezado={{
          titulo: TITULO_DE_VEHICULOS_DEL_LEAD,
          accion: datos.puedoActuar ? <VincularOMarcar /> : null,
        }}
        vacio={TEXTO_SIN_VEHICULOS}
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
          return {
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
