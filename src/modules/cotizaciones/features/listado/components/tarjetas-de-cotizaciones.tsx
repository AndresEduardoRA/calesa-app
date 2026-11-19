'use client'

import type { ReactNode } from 'react'
import { cotizacionDeLaEntrada, textoDelConteo } from '../../../entities/listado/grupos-del-listado'
import { BotonDelConteo } from './grupo'
import { TarjetaEnLaLista } from './tarjeta-en-la-lista'
import {
  origenDe,
  type CompartirDe,
  type EntradaDeLaLista,
  type HuecosDeLaLista,
  type MenuDeFila,
  type OrigenDelListado,
} from './tipos'

type Props = {
  entradas: readonly EntradaDeLaLista[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  huecos?: HuecosDeLaLista | undefined
  rutaDeClientes: string | null
  // Qué grupos están desplegados (por la cotización que los ordena) y cómo se despliega uno.
  desplegados: ReadonlySet<string>
  alternar: (ordenId: string) => void
  despliegue: (entrada: Extract<EntradaDeLaLista, { tipo: 'grupo' }>) => ReactNode
  idDelDespliegue: (ordenId: string) => string
}

// La lista en tarjetas (en el celular siempre; en escritorio, por defecto o si la persona las eligió): una por grupo (con los datos de su cabeza) o por
// cotización. Una grilla de columnas de 17 rem que no ensancha la página (`min(100%, 17rem)`), sin `auto-rows-fr`: el despliegue de un grupo va justo después de su
// tarjeta, a todo el ancho (`col-span-full`), y estiraría todas las filas; las tarjetas miden lo mismo por sus filas de alto fijo (`TarjetaEnLaLista`).
export function TarjetasDeCotizaciones({
  entradas,
  origenes,
  alAbrir,
  abierta,
  menuDeFila,
  compartirDe,
  huecos,
  rutaDeClientes,
  desplegados,
  alternar,
  despliegue,
  idDelDespliegue,
}: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
      {entradas.map((entrada) => {
        const cotizacion = cotizacionDeLaEntrada(entrada)
        const texto = entrada.tipo === 'grupo' ? textoDelConteo(entrada.conteo) : null
        const abiertoElGrupo = entrada.tipo === 'grupo' && desplegados.has(entrada.ordenId)
        return [
          <TarjetaEnLaLista
            key={entrada.ordenId}
            cotizacion={cotizacion}
            origen={origenDe(origenes, cotizacion.origenId)}
            abierta={abierta === cotizacion.id}
            alAbrir={() => {
              alAbrir(cotizacion.id)
            }}
            menu={menuDeFila?.(cotizacion, { sinCompartir: true })}
            compartir={compartirDe?.(cotizacion) ?? null}
            Portada={huecos?.Portada}
            rutaDeClientes={rutaDeClientes}
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
          />,
          entrada.tipo === 'grupo' && abiertoElGrupo ? (
            <li key={`${entrada.ordenId}-despliegue`} className="col-span-full min-w-0">
              {despliegue(entrada)}
            </li>
          ) : null,
        ]
      })}
    </ul>
  )
}
