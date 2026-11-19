'use client'

import { Fragment, type ReactNode } from 'react'
import { CabeceraPegada, TablaDeLista } from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { cotizacionDeLaEntrada, textoDelConteo } from '../../../entities/listado/grupos-del-listado'
import { FilaDeLaCotizacion } from './celdas-de-la-tabla'
import { BotonDelConteo } from './grupo'
import type { EntradaDeLaLista, MenuDeFila, OrigenDelListado } from './tipos'

type Props = {
  entradas: readonly EntradaDeLaLista[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
  // El «⋯» de cada fila, a la derecha, con «Compartir cotización…» primero; sin él no hay columna.
  menuDeFila?: MenuDeFila | undefined
  desplegados: ReadonlySet<string>
  alternar: (ordenId: string) => void
  despliegue: (entrada: Extract<EntradaDeLaLista, { tipo: 'grupo' }>) => ReactNode
  idDelDespliegue: (ordenId: string) => string
}

// Las columnas de la tabla (sin la del «⋯»): lo que ocupa la fila del despliegue.
const COLUMNAS = 9

// La lista en tabla (escritorio, si la persona la eligió), con el patrón de lista (`@/shared/ui/lista`): «N.º n» es el botón de la fila; un clic en la fila abre el
// resumen `?cotizacion=`, salvo el «⋯» de la derecha y el conteo de un grupo. Agrupada, la fila de un grupo es la de su cabeza y lleva en «Vehículo» el botón
// «N cotizaciones de este vehículo», que despliega las demás en una fila debajo.
export function TablaDeCotizaciones({
  entradas,
  origenes,
  alAbrir,
  abierta,
  menuDeFila,
  desplegados,
  alternar,
  despliegue,
  idDelDespliegue,
}: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Cotización</CabeceraPegada>
          <TableHead>Título</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Clase</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead>Creada</TableHead>
          {menuDeFila ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entradas.map((entrada) => {
          const cotizacion = cotizacionDeLaEntrada(entrada)
          const texto = entrada.tipo === 'grupo' ? textoDelConteo(entrada.conteo) : null
          const abiertoElGrupo = entrada.tipo === 'grupo' && desplegados.has(entrada.ordenId)
          return (
            <Fragment key={entrada.ordenId}>
              <FilaDeLaCotizacion
                cotizacion={cotizacion}
                origenes={origenes}
                abierta={abierta === cotizacion.id}
                alAbrir={() => {
                  alAbrir(cotizacion.id)
                }}
                conteo={
                  texto === null ? null : (
                    <BotonDelConteo
                      texto={texto}
                      abierto={abiertoElGrupo}
                      controla={idDelDespliegue(entrada.ordenId)}
                      alAlternar={() => {
                        alternar(entrada.ordenId)
                      }}
                    />
                  )
                }
                menu={menuDeFila ? menuDeFila(cotizacion) : undefined}
              />
              {entrada.tipo === 'grupo' && abiertoElGrupo ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={menuDeFila ? COLUMNAS + 1 : COLUMNAS}
                    className="whitespace-normal"
                  >
                    {despliegue(entrada)}
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          )
        })}
      </TableBody>
    </TablaDeLista>
  )
}
