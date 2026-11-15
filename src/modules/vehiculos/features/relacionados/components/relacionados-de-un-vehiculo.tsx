'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  accionesDeLaFila,
  rutaDeVerTodos,
  type AnclaDeVehiculo,
  type ContextoDeAcciones,
  type LugarDeRelacionados,
  type ParaRelacionados,
} from '../../../entities/acciones-de-relacionados'
import type { AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import type {
  FilaRelacionada,
  GrupoDeRelacionados,
  LeadRelacionado,
  RelacionadosDelVehiculo,
} from '../../../entities/relacionados'
import { useAccionesDeRelacionados } from '../hooks/use-acciones-de-relacionados'
import { usePanelDeRelacionados } from '../hooks/use-panel-de-relacionados'
import { usePanelesDeLaFicha } from '../hooks/use-paneles-de-la-ficha'
import { FilaDeLead } from './fila-de-lead'
import type { HuecosDeRelacionados } from './huecos'
import { PanelesDeLaFicha } from './paneles-de-la-ficha'
import { Relacionados } from './relacionados'
import { VerTodosDelVehiculo } from './ver-todos-del-vehiculo'

type Props = {
  datos: RelacionadosDelVehiculo
  vehiculoId: string
  lugar: LugarDeRelacionados
  para: ParaRelacionados
  huecos?: HuecosDeRelacionados
  numeroGlobal?: boolean
  // La ficha: lo que ofrece el aviso de desvinculado (la papelera) y su alcance.
  ofrecerPapelera?: boolean
  avisos?: AvisosDelMenu
  // El resumen lee en el navegador: tras una acción lograda vuelve a leer.
  alCambiar?: () => void
  // La unidad de logística lo pide en una línea de chips; el resto, el bloque.
  presentacion?: 'bloque' | 'linea'
}

const claveDeLaFila = (grupo: string, fila: FilaRelacionada<LeadRelacionado>) =>
  `${grupo}-${fila.contraparte.leadId}${fila.detalle.tipo === 'cotizado' ? `-${fila.detalle.cotizacion.id}` : ''}`

// Sobre qué vehículo se mira: el ancla de las acciones, su contexto y lo que piden los avisos y desvincular (título, número y versión).
function armarContexto(
  datos: RelacionadosDelVehiculo,
  vehiculoId: string,
  lugar: LugarDeRelacionados,
  para: ParaRelacionados,
) {
  const ancla: AnclaDeVehiculo = {
    lado: 'vehiculo',
    vehiculoId,
    origenId: datos.origenId,
    editable: datos.editable,
  }
  const contexto: ContextoDeAcciones = { lugar, ancla, para }
  const delVehiculo = {
    id: vehiculoId,
    titulo: datos.titulo,
    numero: datos.numero,
    actualizadoEn: datos.actualizadoEn,
  }
  return { ancla, contexto, delVehiculo }
}

// «Ver todos» de un grupo: sólo si hay más que ver; desde un resumen lleva a la ficha, en los demás abre el drawer.
function verTodosDelGrupo({
  datos,
  grupo,
  lugar,
  ancla,
  abrir,
}: {
  datos: RelacionadosDelVehiculo
  grupo: GrupoDeRelacionados<LeadRelacionado>
  lugar: LugarDeRelacionados
  ancla: AnclaDeVehiculo
  abrir: (tipo: GrupoDeRelacionados<LeadRelacionado>['tipo']) => void
}) {
  if (!(grupo.tipo === 'vinculado' ? datos.conAnteriores : grupo.hayMas)) {
    return null
  }
  return lugar === 'resumen'
    ? { href: rutaDeVerTodos(ancla, grupo.tipo) }
    : {
        abrir: () => {
          abrir(grupo.tipo)
        },
      }
}

// El bloque «Relacionados» de un vehículo (sus leads): lo comparten la ficha, la unidad de logística y el resumen del inventario. Cada acción hace lo suyo en el lugar o lleva a la ficha con el
// panel abierto (los selectores y la confirmación de desvincular viven en la URL de la ficha; en un resumen o en la unidad no caben).
export function RelacionadosDeUnVehiculo({
  datos,
  vehiculoId,
  lugar,
  para,
  huecos,
  numeroGlobal = false,
  ofrecerPapelera = false,
  avisos,
  alCambiar,
  presentacion = 'bloque',
}: Props) {
  const { ancla, contexto, delVehiculo } = armarContexto(datos, vehiculoId, lugar, para)
  const acciones = useAccionesDeRelacionados(
    { lado: 'vehiculo', vehiculo: delVehiculo },
    { ...(alCambiar ? { alCambiar } : {}), alAbrir: (accion) => paneles.abrir(accion) },
  )
  const paneles = usePanelesDeLaFicha({ vincularA: acciones.vincularA, marcarA: acciones.marcarA })
  const verTodos = usePanelDeRelacionados()
  const ultimoTipo = useUltimo(verTodos.tipo)
  // En un resumen «Ver todos» lleva a la ficha: el drawer es de la ficha y de la unidad.
  const montarVerTodos = useAbiertoAlgunaVez(verTodos.tipo !== null && lugar !== 'resumen')
  const filaDe = (fila: FilaRelacionada<LeadRelacionado>, clave: string) => (
    <FilaDeLead
      key={clave}
      fila={fila}
      acciones={accionesDeLaFila(fila, contexto)}
      enCurso={acciones.enCurso}
      alElegir={(accion) => {
        acciones.ejecutar(accion, fila)
      }}
    />
  )
  return (
    <>
      <Relacionados
        presentacion={presentacion}
        grupos={datos.grupos}
        contexto={contexto}
        enCurso={acciones.enCurso}
        alElegir={(accion) => {
          acciones.ejecutar(accion, null)
        }}
        filasDe={(grupo: GrupoDeRelacionados<LeadRelacionado>) =>
          grupo.filas.map((fila) => filaDe(fila, claveDeLaFila(grupo.tipo, fila)))
        }
        verTodosDe={(grupo) =>
          verTodosDelGrupo({ datos, grupo, lugar, ancla, abrir: verTodos.abrir })
        }
      />
      {lugar === 'ficha' ? (
        <PanelesDeLaFicha
          paneles={paneles}
          vehiculo={delVehiculo}
          origenId={datos.origenId}
          editable={datos.editable}
          huecos={huecos}
          numeroGlobal={numeroGlobal}
          ofrecerPapelera={ofrecerPapelera}
          avisos={avisos}
        />
      ) : null}
      {montarVerTodos ? (
        <VerTodosDelVehiculo
          vehiculoId={vehiculoId}
          tipo={verTodos.tipo}
          ultimoTipo={ultimoTipo}
          alCerrar={verTodos.cerrar}
          filaDe={filaDe}
        />
      ) : null}
    </>
  )
}
