'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  SIN_ENTRADA_PARA_CONSULTAR,
  SIN_PERMISO_PARA_EDITAR,
} from '../../../entities/ofertas-del-menu-de-vehiculo'
import type {
  DatosDelPanelDeImagenes,
  DatosDelPanelDeVitrina,
} from '../../../entities/paneles-de-la-lista'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import type { usePanelConVehiculo } from '../../acciones/hooks/use-panel-con-vehiculo'
import {
  ActualizarLosDatosDiferido,
  PanelDeImagenesDiferido,
  PanelDeVitrinaDeLaListaDiferido,
} from './diferidos'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'

type Panel = ReturnType<typeof usePanelConVehiculo>

export type SubastaDeLaLista = {
  // Los de esta página con enlace, lote o VIN para consultar.
  consultables: readonly string[]
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
}

type Props = Pick<DatosDelOrigen, 'origen' | 'fases' | 'campos'> & {
  imagenes: Panel
  vitrina: Panel
  actualizar: Panel
  datosDeImagenes: DatosDelPanelDeImagenes | null
  datosDeVitrina: DatosDelPanelDeVitrina | null
  filas: readonly FilaDeVehiculo[]
  editables: ReadonlySet<string>
  publicar: PermisoDeVitrina
  subasta: SubastaDeLaLista | null
}

// Por qué «Actualizar los datos» no se abre para el vehículo de la URL (null = se abre).
function motivoParaActualizar(
  fila: FilaDeVehiculo | undefined,
  editables: ReadonlySet<string>,
  subasta: SubastaDeLaLista | null,
): string | null {
  if (subasta === null) {
    return 'En este origen no se consulta la subasta.'
  }
  if (!fila) {
    return 'Ese vehículo no está en esta página del inventario.'
  }
  if (!editables.has(fila.id)) {
    return SIN_PERMISO_PARA_EDITAR
  }
  return subasta.consultables.includes(fila.id) ? null : SIN_ENTRADA_PARA_CONSULTAR
}

// «Actualizar los datos» de un vehículo de esta página. Un enlace a mano con uno que no se puede consultar no abre: avisa y limpia la URL.
function ActualizarDeLaLista({
  actualizar,
  filas,
  editables,
  subasta,
}: Pick<Props, 'actualizar' | 'filas' | 'editables' | 'subasta'>) {
  const fila = filas.find((una) => una.id === actualizar.para)
  const motivo = actualizar.abierto ? motivoParaActualizar(fila, editables, subasta) : null
  const rechazada = useRevisionAlAbrir(
    actualizar.abierto ? (actualizar.para ?? '') : null,
    motivo,
    actualizar.cerrar,
  )
  const abierto = actualizar.abierto && !rechazada && motivo === null
  const montar = useAbiertoAlgunaVez(abierto)
  return montar && subasta ? (
    <ActualizarLosDatosDiferido
      abierto={abierto}
      alCerrar={actualizar.cerrar}
      vehiculo={abierto && fila ? fila : null}
      puedeConfigurar={subasta.puedeConfigurar}
    />
  ) : null
}

// Los paneles del «⋯» del inventario, una vez por lista y cada uno con su URL: «Editar imágenes» y «Publicar en la web» (`?panel=imagenes|vitrina&para=<id>`,
// leídos en el servidor al abrirse) y «Actualizar los datos» (`?panel=actualizar-datos&para=<id>`, de un vehículo de esta página). Su código llega al abrirse.
export function PanelesDeLaLista(props: Props) {
  const { imagenes, vitrina } = props
  const montarImagenes = useAbiertoAlgunaVez(imagenes.abierto)
  const montarVitrina = useAbiertoAlgunaVez(
    vitrina.abierto && props.publicar.estado === 'habilitado',
  )
  return (
    <>
      {montarImagenes ? (
        <PanelDeImagenesDiferido
          abierto={imagenes.abierto}
          alCerrar={imagenes.cerrar}
          esperado={imagenes.para}
          datos={props.datosDeImagenes}
        />
      ) : null}
      {montarVitrina ? (
        <PanelDeVitrinaDeLaListaDiferido
          abierto={vitrina.abierto}
          alCerrar={vitrina.cerrar}
          esperado={vitrina.para}
          datos={props.datosDeVitrina}
          permiso={props.publicar}
          origen={props.origen}
          fases={props.fases}
          campos={props.campos}
        />
      ) : null}
      <ActualizarDeLaLista
        actualizar={props.actualizar}
        filas={props.filas}
        editables={props.editables}
        subasta={props.subasta}
      />
    </>
  )
}
