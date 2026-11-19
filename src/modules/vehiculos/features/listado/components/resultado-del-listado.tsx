'use client'

import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { frasePorVacio, type OrigenResumen } from '@/modules/origenes/client'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { ubicacionDeLaPagina, type Pagina } from '@/shared/lib/paginacion'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { Paginacion, UbicacionDeLaPagina } from '@/shared/ui/paginacion'
import { BarraDeSeleccion } from '../../papelera/components/barra-de-seleccion'
import { usePapeleraDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { TablaDeVehiculos } from './tabla-de-vehiculos'
import { TarjetasDeVehiculos } from './tarjetas-de-vehiculos'
import type { AlcanceDeAvisos } from '../../../entities/avisos-de-vehiculo'
import type { AprobadasDeLaPagina } from '../../../entities/cotizacion-aprobada-de-la-fila'
import type { ParaCotizar } from '../../../entities/ruta-para-cotizar'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import type {
  DatosDelPanelDeImagenes,
  DatosDelPanelDeVitrina,
} from '../../../entities/paneles-de-la-lista'
import { useMenuDeLaLista } from '../hooks/use-menu-de-la-lista'
import { PanelesDeLaLista, type SubastaDeLaLista } from './paneles-de-la-lista'
import type { DatosDelOrigen, FilaDeVehiculo } from './tipos'

type Props = DatosDelOrigen & {
  pagina: Pagina<FilaDeVehiculo>
  // «Nuevo», si la persona puede dar de alta acá: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
  // Los ids de la página que la persona puede editar, y si edita en este origen (lo que no puede editar se ve apagado, no oculto).
  editables: readonly string[]
  editaEnElOrigen: boolean
  // Y los que puede enviar a la papelera: son los que se pueden elegir.
  eliminables: readonly string[]
  leadsVisibles: readonly string[]
  alcance: AlcanceDeAvisos
  // La cotización aprobada de cada vehículo de la página, ya armada por la página (con la ruta de su cotización); nulo si quien mira no ve cotizaciones.
  aprobadas: AprobadasDeLaPagina | null
  // Si puede publicar en este origen: sin eso «Publicar en la web…» no está en el «⋯».
  publicar: PermisoDeVitrina
  // Si cotiza en este origen: sin eso «Cotizar vehículo» no está en el «⋯».
  paraCotizar: ParaCotizar | null
  // «Ver actividad» del «⋯»: la plantilla de `/actividad` con `MARCADOR_DE_VEHICULO`, o null sin `actividad.ver` (la arma la página).
  paraActividad: string | null
  // «Actualizar los datos»: en un origen de subasta con apibara, lo que se puede consultar; null = no aplica.
  subasta: SubastaDeLaLista | null
  // Lo que el servidor leyó para el panel que nombra la URL (`?panel=imagenes|vitrina&para=<id>`); null si no lo nombra.
  panelDeImagenes: DatosDelPanelDeImagenes | null
  panelDeVitrina: DatosDelPanelDeVitrina | null
  // Tabla o tarjetas en escritorio (se elige en «Vista y opciones»).
  vista: VistaDeLista
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// La página sin filas: vacío por filtro (con «Limpiar»), una página que se quedó sin filas o el vacío de primera vez (con la frase del origen).
function SinFilas({ origen, accionDeVacio }: { origen: OrigenResumen; accionDeVacio?: ReactNode }) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  if (filtros.hayFiltros) {
    return <EstadoSinResultados alLimpiar={filtros.limpiar} />
  }
  if (hayCursor) {
    return <EstadoPaginaSinFilas />
  }
  return (
    <EstadoVacio
      titulo={mayuscula(frasePorVacio(origen))}
      descripcion={
        origen.activo
          ? 'Lo que se dé de alta en este origen va a aparecer acá.'
          : 'Este origen está desactivado: no recibe registros nuevos.'
      }
      accion={accionDeVacio}
    />
  )
}

// La lista de un origen o el estado que corresponda: vacío de primera vez (con la frase del
// origen), vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista (`<UnaSolaVista>`, como el listado de
// leads): la tabla desde `md` y las tarjetas por debajo, o las tarjetas en todo ancho si la persona las eligió.
export function ResultadoDelListado(props: Props) {
  const { pagina, accionDeVacio, vista, panelDeImagenes, panelDeVitrina, ...resto } = props
  const { editables, eliminables, leadsVisibles, alcance, editaEnElOrigen, ...demas } = resto
  const { publicar, aprobadas, paraCotizar, paraActividad, subasta, ...datos } = demas
  const ancha = useAlMenos(CORTE_DE_LA_TABLA)
  const { origen } = datos
  const { menu, paneles } = useMenuDeLaLista({
    editables,
    editaEnElOrigen,
    eliminables,
    leadsVisibles,
    alcance,
    publicar,
    cotizar: paraCotizar,
    paraActividad,
    consultables: subasta?.consultables ?? null,
  })
  const papelera = usePapeleraDelListado(pagina.filas, eliminables)

  if (pagina.filas.length === 0) {
    return <SinFilas origen={origen} accionDeVacio={accionDeVacio} />
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UbicacionDeLaPagina ubicacion={ubicacionDeLaPagina(pagina)} />
      <UnaSolaVista
        preferida={vista}
        tabla={() => (
          <TablaDeVehiculos
            {...datos}
            vehiculos={pagina.filas}
            encabezado={mayuscula(origen.sustantivo)}
            menu={menu}
            seleccion={papelera.seleccion}
            aprobadas={aprobadas}
          />
        )}
        tarjetas={() => (
          <TarjetasDeVehiculos
            {...datos}
            grande={ancha}
            vehiculos={pagina.filas}
            menu={menu}
            seleccion={papelera.seleccion}
            aprobadas={aprobadas}
          />
        )}
      />
      <PanelesDeLaLista
        {...paneles}
        datosDeImagenes={panelDeImagenes}
        datosDeVitrina={panelDeVitrina}
        filas={pagina.filas}
        editables={menu.editables}
        publicar={publicar}
        subasta={subasta}
        origen={datos.origen}
        fases={datos.fases}
        campos={datos.campos}
      />
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
      {papelera.cantidad > 0 ? (
        <BarraDeSeleccion
          origen={origen}
          cantidad={papelera.cantidad}
          enCurso={papelera.enCurso}
          alEnviar={() => {
            void papelera.enviar()
          }}
          alLimpiar={papelera.limpiar}
        />
      ) : null}
    </div>
  )
}
