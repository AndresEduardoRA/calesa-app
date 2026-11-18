'use client'

import type { ReactNode } from 'react'
import { SufijoDeVisto, EnlaceDeLaFila, EsquinaDeAcciones, TarjetaDeLista } from '@/shared/ui/lista'
import { cn } from 'cn'
import { camposDeTarjeta, type CampoDeVehiculo } from '../../../entities/campo'
import type { CotizacionAprobadaDeLaFila } from '../../../entities/cotizacion-aprobada-de-la-fila'
import type { PrecioDeLaFila } from '../../../entities/precio-de-la-fila'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useIdentidad } from '../hooks/use-identidad'
import { BadgeDeSituacion } from './badge-de-situacion'
import { AprobadaDeTarjeta } from './celda-de-aprobada'
import { PrecioDeTarjeta } from './precio-de-la-fila'
import { ValorDeCampo } from './valor-de-campo'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'

type Props = {
  vehiculo: Vehiculo
  // El layout del origen del vehículo: de ahí salen los datos «en tarjeta».
  campos: readonly CampoDeVehiculo[]
  fase: { nombre: string; color: string } | null
  // Su ficha (`/vehiculos/<id>`): un clic en cualquier parte de la tarjeta la abre, o Enter sobre su nombre, que es el enlace.
  ficha: string
  // Lo que se puede hacer con él (editar): arriba a la derecha de la tarjeta, o sobre la foto si es grande.
  acciones?: ReactNode
  // Lo que va al lado de la fase (si está en la vitrina).
  insignias?: ReactNode
  // La casilla para elegirlo: delante de la miniatura, o sobre la foto (arriba a la izquierda, espejo del «⋯») si es grande.
  seleccion?: ReactNode
  // El precio, o la puja con su rótulo en un origen de subasta (`precioDeLaFila`).
  precio: PrecioDeLaFila | null
  // Su cotización aprobada; nulo = no hay o no se ve.
  aprobada?: CotizacionAprobadaDeLaFila | null
  // En escritorio, con las tarjetas elegidas: la foto arriba, a todo el ancho y con su carrusel.
  grande?: boolean
}

// La foto de la tarjeta grande, a todo el ancho, con la casilla sobre su esquina izquierda y el «⋯» sobre la derecha (espejos).
function FotoGrande({
  vehiculo,
  seleccion,
  acciones,
}: Pick<Props, 'vehiculo' | 'seleccion' | 'acciones'>) {
  return (
    <div className="relative w-full">
      <FotosEnElLugar vehiculo={vehiculo} modo="carrusel" className="w-full" />
      {seleccion ? (
        <EsquinaDeAcciones sobreImagen lado="izquierda">
          {seleccion}
        </EsquinaDeAcciones>
      ) : null}
      {acciones ? <EsquinaDeAcciones sobreImagen>{acciones}</EsquinaDeAcciones> : null}
    </div>
  )
}

// Un vehículo en una tarjeta de la lista (`@/shared/ui/lista`): lo que se ve en el celular en vez de la fila de la tabla.
export function TarjetaVehiculo(props: Props) {
  const { vehiculo, campos, fase, ficha, acciones, insignias, seleccion, precio } = props
  const aprobada = props.aprobada ?? null
  const grande = props.grande ?? false
  const identidad = useIdentidad(campos)(vehiculo)
  const datos = camposDeTarjeta(campos).filter((campo) => {
    const valor = vehiculo.atributos[campo.clave]
    return valor !== undefined && valor !== null && valor !== ''
  })
  return (
    <TarjetaDeLista href={ficha} idDeVisto={vehiculo.id} acciones={grande ? undefined : acciones}>
      {/* Con el texto al 200 % la tarjeta mide menos de 16 rem: la miniatura (rem) y el título no caben en una fila y se apilan. */}
      {/* Grande, la foto va arriba a todo el ancho (con flechas: ahí caben), la casilla sobre su esquina izquierda y el «⋯» sobre la */}
      {/* derecha: la foto no se achica por una columna. Sin foto (o si no carga) quedan en el mismo lugar sobre el recuadro 4:3. */}
      <div className={cn('flex items-start gap-3 @max-[16rem]:flex-col', grande && 'flex-col')}>
        {grande ? (
          <FotoGrande vehiculo={vehiculo} seleccion={seleccion} acciones={acciones} />
        ) : (
          <>
            {seleccion}
            <FotosEnElLugar vehiculo={vehiculo} modo="abrir" className="w-20" />
          </>
        )}
        <div className={cn('grid min-w-0 flex-1 gap-1 @max-[16rem]:flex-none', grande && 'w-full')}>
          <h3 className="text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
            <EnlaceDeLaFila href={ficha} nombre={identidad.nombre}>
              {identidad.nombre}
            </EnlaceDeLaFila>
          </h3>
          <p className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
            {identidad.titulo === null ? '' : `${identidad.titulo} · `}#{vehiculo.numero}
            {vehiculo.anio ? ` · ${String(vehiculo.anio)}` : ''}
            {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
            <SufijoDeVisto id={vehiculo.id} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeDeSituacion situacion={vehiculo.situacion} fase={fase} />
            {insignias}
            <PrecioDeTarjeta precio={precio} />
          </div>
          <AprobadaDeTarjeta aprobada={aprobada} />
        </div>
      </div>
      {datos.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-(--color-line) pt-3">
          {datos.map((campo) => (
            <div key={campo.clave} className="grid min-w-0">
              <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
                {campo.etiqueta}
              </dt>
              <dd className="truncate text-(length:--text-sm) text-(--color-ink)">
                <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </TarjetaDeLista>
  )
}
