'use client'

import {
  CabeceraPegada,
  CeldaPegada,
  EnlaceDeLaFila,
  FilaDeLista,
  TablaDeLista,
  SufijoDeVisto,
} from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rutaDeLaFichaDelVehiculo } from '../../../entities/acciones-de-relacionados'
import { camposDeTarjeta, type CampoDeVehiculo } from '../../../entities/campo'
import { etiquetaDeComun, loteALaVista } from '../../../entities/comunes'
import {
  camposSinLaCompraDirecta,
  columnaDeCompraDirecta,
  compraDirectaDeLaFila,
  ROTULO_DE_LA_COMPRA_DIRECTA,
  type ColumnaDeCompraDirecta,
} from '../../../entities/compra-directa-de-la-fila'
import {
  aprobadaDeLaFila,
  ROTULO_DEL_COSTO_ESTIMADO,
  type AprobadasDeLaPagina,
} from '../../../entities/cotizacion-aprobada-de-la-fila'
import {
  columnaDePrecio,
  precioDeLaFila,
  type ColumnaDePrecio,
} from '../../../entities/precio-de-la-fila'
import type { IdentidadDeVehiculo } from '../../../entities/identidad'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { useIdentidad } from '../hooks/use-identidad'
import { BadgeDeSituacion } from './badge-de-situacion'
import { MenuDeFila } from './menu-de-fila'
import {
  faseDe,
  hayMenuEnLaPagina,
  vitrinaDe,
  type DatosDelOrigen,
  type FilaDeVehiculo,
  type ParaElMenuDeLaLista,
} from './tipos'
import { CuentaRegresivaDelCierre } from '../../subasta/components/cuenta-regresiva-del-cierre'
import { CeldaDeCompraDirecta } from './compra-directa'
import { CeldaDeCostoEstimado } from './costo-estimado'
import { CeldaDePrecio, EncabezadoDePrecio } from './precio-de-la-fila'
import { ValorDeCampo } from './valor-de-campo'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'
import { BotonDeVitrinaDeLaFila } from '../../vitrina/components/boton-de-vitrina-de-la-fila'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  // Cómo se llama lo que entra por este origen («Unidad», «Lote»): encabeza la primera columna.
  encabezado: string
  // Qué ofrece el «⋯» de cada fila.
  menu: ParaElMenuDeLaLista
  // Las filas que se pueden elegir (para enviarlas juntas a la papelera) y las elegidas.
  seleccion: SeleccionDelListado
  // Su cotización aprobada por vehículo (el «Costo estimado»); nulo = quien mira no ve cotizaciones: la columna no se dibuja.
  aprobadas: AprobadasDeLaPagina | null
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// El hueco de la casilla en una fila que no se puede elegir: los nombres quedan alineados.
const HUECO_DE_CASILLA = <span aria-hidden className="size-[44px] shrink-0 md:size-7" />

type PropsDeFila = Pick<
  Props,
  'origen' | 'fases' | 'vitrina' | 'limpiezaHoy' | 'menu' | 'seleccion' | 'aprobadas' | 'ahora'
> & {
  vehiculo: FilaDeVehiculo
  // Lo que lo nombra: su campo principal (con el título debajo) o su título.
  identidad: IdentidadDeVehiculo
  columnas: readonly CampoDeVehiculo[]
  // «Precio» o, en un origen de subasta con la puja en su layout, «Puja actual».
  columnaPrecio: ColumnaDePrecio
  // En un origen de subasta, las columnas «Lote» y «Compra directa» (`no_aplica` en uno manual: no hay ninguna de las dos).
  columnaCompra: ColumnaDeCompraDirecta
  // Alguna fila de la página tiene algo en su «⋯»: la columna existe.
  conMenu: boolean
}

// La casilla para elegir la fila; si se puede elegir alguna de la página pero no ésta, su hueco (los nombres quedan alineados).
function CasillaDeLaFila({
  seleccion,
  id,
  nombre,
}: {
  seleccion: SeleccionDelListado
  id: string
  nombre: string
}) {
  if (seleccion.seleccionables.size === 0) return null
  if (!seleccion.seleccionables.has(id)) return HUECO_DE_CASILLA
  return (
    <CasillaDeSeleccion
      etiqueta={`Seleccionar ${nombre}`}
      elegida={seleccion.elegidas.has(id)}
      alCambiar={() => {
        seleccion.alternar(id)
      }}
    />
  )
}

// La situación (o la fase), si está en la vitrina, «Publicar» y la fecha de la limpieza; debajo, en un vehículo en subasta, la cuenta regresiva de su cierre.
function CeldaDeFase({
  vehiculo,
  fase,
  origen,
  vitrina,
  limpiezaHoy,
  menu,
  ahora,
}: Pick<PropsDeFila, 'vehiculo' | 'origen' | 'vitrina' | 'limpiezaHoy' | 'menu' | 'ahora'> & {
  fase: ReturnType<typeof faseDe>
}) {
  return (
    <TableCell>
      <div className="flex flex-wrap items-center gap-1.5">
        <BadgeDeSituacion situacion={vehiculo.situacion} fase={fase} />
        <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
        {menu.publicar.estado === 'habilitado' ? (
          <BotonDeVitrinaDeLaFila
            vehiculo={vehiculo}
            alPublicar={() => {
              menu.abrirVitrina(vehiculo.id)
            }}
          />
        ) : null}
        <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
      </div>
      {origen.tipo === 'subasta' && vehiculo.situacion === 'en_subasta' ? (
        <CuentaRegresivaDelCierre
          cierre={vehiculo.cierreSubastaEn}
          ahora={ahora}
          className="mt-1"
        />
      ) : null}
    </TableCell>
  )
}

// La fila de un vehículo: un enlace a su ficha (el nombre es el `<a>`; el resto de la fila navega igual). La casilla va delante del nombre y
// el «⋯» pegado a la derecha; esa columna sólo existe si alguna fila de la página la usa.
function FilaDeTabla({
  vehiculo,
  identidad,
  columnas,
  columnaPrecio,
  columnaCompra,
  origen,
  fases,
  vitrina,
  limpiezaHoy,
  menu,
  seleccion,
  aprobadas,
  ahora,
  conMenu,
}: PropsDeFila) {
  const fase = faseDe(fases, vehiculo.faseId)
  const ficha = rutaDeLaFichaDelVehiculo(vehiculo.id)
  return (
    <FilaDeLista href={ficha} idDeVisto={vehiculo.id}>
      <CeldaPegada lado="nombre">
        <div className="flex items-center gap-3">
          <CasillaDeLaFila seleccion={seleccion} id={vehiculo.id} nombre={identidad.nombre} />
          <FotosEnElLugar vehiculo={vehiculo} modo="abrir" className="w-14" />
          <div className="grid min-w-0">
            <EnlaceDeLaFila
              href={ficha}
              nombre={identidad.nombre}
              className="max-w-72 truncate font-medium text-(--color-ink)"
            >
              {identidad.nombre}
            </EnlaceDeLaFila>
            <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
              {identidad.titulo === null ? '' : `${identidad.titulo} · `}#{vehiculo.numero}
              <SufijoDeVisto id={vehiculo.id} />
              {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
            </span>
          </div>
        </div>
      </CeldaPegada>
      <CeldaDeFase
        vehiculo={vehiculo}
        fase={fase}
        origen={origen}
        vitrina={vitrina}
        limpiezaHoy={limpiezaHoy}
        menu={menu}
        ahora={ahora}
      />
      <TableCell className="text-right tabular-nums">{vehiculo.anio ?? VACIO}</TableCell>
      {columnaCompra.tipo === 'no_aplica' ? null : (
        <TableCell className="tabular-nums">{loteALaVista(vehiculo.lote) ?? VACIO}</TableCell>
      )}
      <TableCell className="text-right">
        <CeldaDePrecio precio={precioDeLaFila(vehiculo, columnaPrecio)} />
      </TableCell>
      {columnaCompra.tipo === 'no_aplica' ? null : (
        <TableCell className="text-right">
          <CeldaDeCompraDirecta valor={compraDirectaDeLaFila(vehiculo.atributos, columnaCompra)} />
        </TableCell>
      )}
      {aprobadas === null ? null : (
        <TableCell className="text-right">
          <CeldaDeCostoEstimado aprobada={aprobadaDeLaFila(aprobadas, vehiculo.id)} />
        </TableCell>
      )}
      {columnas.map((campo) => (
        <TableCell key={campo.clave} className="max-w-48 truncate">
          <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
        </TableCell>
      ))}
      {conMenu ? (
        <CeldaPegada lado="acciones" className="text-right">
          <MenuDeFila vehiculo={vehiculo} fases={fases} para={menu} />
        </CeldaPegada>
      ) : null}
    </FilaDeLista>
  )
}

// El inventario de un origen en escritorio, con el patrón de lista (`@/shared/ui/lista`): lo común adelante (en subasta, con «Lote» y «Compra directa»;
// con `cotizaciones.ver`, «Costo estimado») y, después, una columna por cada campo «en tarjeta» del layout (sin el de la compra directa). Un clic en cualquier parte de la fila abre la ficha del vehículo, salvo el de la casilla, la
// miniatura, «Publicar» y el «⋯». La tabla es tan ancha como lo pidan sus columnas y se desplaza dentro de su tarjeta, con el nombre a la vista.
export function TablaDeVehiculos({ vehiculos, campos, encabezado, ...resto }: Props) {
  const { menu, seleccion, vehiculos: filas } = { ...resto, vehiculos }
  const conMenu = hayMenuEnLaPagina(filas, menu)
  const esSubasta = resto.origen.tipo === 'subasta'
  const columnaCompra = columnaDeCompraDirecta(esSubasta, campos)
  const columnas = camposSinLaCompraDirecta(camposDeTarjeta(campos), columnaCompra)
  const columnaPrecio = columnaDePrecio(esSubasta, campos)
  const identidadDe = useIdentidad(campos)
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">
            <div className="flex items-center gap-3">
              {seleccion.seleccionables.size > 0 ? (
                <CasillaDeSeleccion
                  etiqueta="Seleccionar todos"
                  elegida={seleccion.elegidas.size === seleccion.seleccionables.size}
                  alCambiar={seleccion.alternarTodas}
                />
              ) : null}
              {encabezado}
            </div>
          </CabeceraPegada>
          <TableHead>Fase</TableHead>
          <TableHead className="text-right">Año</TableHead>
          {columnaCompra.tipo === 'no_aplica' ? null : (
            <TableHead>{etiquetaDeComun('lote')}</TableHead>
          )}
          <TableHead className="text-right">
            <EncabezadoDePrecio columna={columnaPrecio} />
          </TableHead>
          {columnaCompra.tipo === 'no_aplica' ? null : (
            <TableHead className="text-right">{ROTULO_DE_LA_COMPRA_DIRECTA}</TableHead>
          )}
          {resto.aprobadas === null ? null : (
            <TableHead className="text-right">{ROTULO_DEL_COSTO_ESTIMADO}</TableHead>
          )}
          {columnas.map((campo) => (
            <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
          ))}
          {conMenu ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehiculos.map((vehiculo) => (
          <FilaDeTabla
            key={vehiculo.id}
            vehiculo={vehiculo}
            identidad={identidadDe(vehiculo)}
            columnas={columnas}
            columnaPrecio={columnaPrecio}
            columnaCompra={columnaCompra}
            conMenu={conMenu}
            {...resto}
          />
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
