'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  BotonDeLaTarjeta,
  TarjetaDeAjustes,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
} from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_SIN_LOGO, MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'
import { useVolverALosNeutros } from '../../iconos/hooks/use-iconos'
import { usePanelesDeLaEmpresa, type MotivosDeLosPaneles } from '../hooks/use-paneles-de-la-empresa'
import {
  ModalDeDatosLegalesDiferido,
  ModalDeIconosDiferido,
  ModalDeIdentidadDiferido,
  ModalDePoliticasDiferido,
  ModalDeRegionDiferido,
} from './diferidos'
import {
  filasDeDatosLegales,
  filasDeIdentidad,
  filasDePoliticas,
  filasDeRegion,
} from './valores-de-la-empresa'

type Props = {
  ajustes: AjustesEmpresa
  // URL pública de los logos guardados, ya armadas en el servidor.
  logoUrl: string | null
  logoOscuroUrl: string | null
  // La dirección del ícono de 192 px en uso (el propio o el neutro), ya armada en el servidor.
  iconoActualUrl: string
  // Las monedas activas, para elegir la base.
  monedas: readonly Moneda[]
  zonas: readonly string[]
  conDatosCargados: boolean
  // Sin `empresa.ajustes.gestionar` se ve todo, con «Editar» apagado y el motivo.
  puedeEditar: boolean
}

// «Editar» en el «⋯»: la primera línea, la principal; apagada dice por qué.
function accionesDeEditar(abrir: () => void, motivo: string | null, extra: AccionDeMenu[] = []) {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      principal: true,
      deshabilitada: motivo !== null,
      despuesDeCerrar: true,
      alElegir: abrir,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
    ...extra,
  ] satisfies AccionDeMenu[]
}

type Editable = { titulo: string; panel: string; motivo: string | null; abrir: () => void }

function TarjetaEditable({
  titulo,
  panel,
  motivo,
  abrir,
  children,
  extra,
}: Editable & {
  children: ReactNode
  extra?: AccionDeMenu[]
}) {
  return (
    <TarjetaDeAjustes
      titulo={titulo}
      accion={<BotonDeLaTarjeta panel={panel} etiqueta="Editar" deshabilitado={motivo !== null} />}
      acciones={<MasAcciones nombre={titulo} acciones={accionesDeEditar(abrir, motivo, extra)} />}
    >
      {children}
    </TarjetaDeAjustes>
  )
}

// La tarjeta de los íconos: el ícono en uso y, si ya se dibujaron, «Volver a los íconos neutros» en el «⋯».
function TarjetaDeIconos({
  props,
  motivo,
  abrir,
}: {
  props: Props
  motivo: string | null
  abrir: () => void
}) {
  const { ajustes, puedeEditar } = props
  const neutros = useVolverALosNeutros(ajustes)
  const extra: AccionDeMenu[] =
    ajustes.iconos && puedeEditar
      ? [
          {
            tipo: 'accion',
            clave: 'neutros',
            etiqueta: 'Volver a los íconos neutros',
            deshabilitada: neutros.enCurso,
            alElegir: () => void neutros.volver(),
          },
        ]
      : []
  return (
    <TarjetaEditable
      titulo="Íconos de la app"
      panel="iconos"
      motivo={motivo}
      abrir={abrir}
      extra={extra}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Image
          src={props.iconoActualUrl}
          alt="Ícono actual de la app"
          width={56}
          height={56}
          unoptimized
          className="size-14"
        />
        <p className="min-w-0 flex-1 text-(length:--text-sm) text-(--color-ink-soft)">
          {ajustes.iconos
            ? 'La app usa los íconos generados desde el logo.'
            : 'La app usa los íconos neutros.'}
        </p>
      </div>
      {props.logoUrl === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{MOTIVO_SIN_LOGO}</p>
      ) : null}
    </TarjetaEditable>
  )
}

type Paneles = ReturnType<typeof usePanelesDeLaEmpresa>

// Los cinco modales, cada uno recién cuando se abre por primera vez.
function ModalesDeLaEmpresa({ props, paneles }: { props: Props; paneles: Paneles }) {
  const { ajustes, conDatosCargados } = props
  const deLosModales = { ajustes, conDatosCargados, alCerrar: paneles.cerrar }
  return (
    <>
      {paneles.identidad.montar ? (
        <ModalDeIdentidadDiferido
          {...deLosModales}
          abierto={paneles.identidad.abierto}
          logoUrl={props.logoUrl}
          logoOscuroUrl={props.logoOscuroUrl}
        />
      ) : null}
      {paneles.region.montar ? (
        <ModalDeRegionDiferido
          {...deLosModales}
          abierto={paneles.region.abierto}
          monedas={props.monedas}
          zonas={props.zonas}
        />
      ) : null}
      {paneles.legales.montar ? (
        <ModalDeDatosLegalesDiferido {...deLosModales} abierto={paneles.legales.abierto} />
      ) : null}
      {paneles.politicas.montar ? (
        <ModalDePoliticasDiferido {...deLosModales} abierto={paneles.politicas.abierto} />
      ) : null}
      {paneles.iconos.montar ? (
        <ModalDeIconosDiferido
          abierto={paneles.iconos.abierto}
          alCerrar={paneles.cerrar}
          logoUrl={props.logoUrl}
          colorAcento={ajustes.colorAcento}
          iconos={ajustes.iconos}
          actualizadoEn={ajustes.actualizadoEn}
        />
      ) : null}
    </>
  )
}

// Las cinco tarjetas de Datos de la empresa, con lo guardado a la vista; cada «Editar» abre su modal (`?panel=<tarjeta>`), que se pide
// recién entonces. Una escritura por modal, todas con la misma versión de la fila.
export function TarjetasDeLaEmpresa(props: Props) {
  const { ajustes, puedeEditar, conDatosCargados } = props
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const motivos: MotivosDeLosPaneles = {
    identidad: motivo,
    region: motivo,
    'datos-legales': motivo,
    politicas: motivo,
    iconos: motivo ?? (props.logoUrl === null ? MOTIVO_SIN_LOGO : null),
  }
  const paneles = usePanelesDeLaEmpresa(motivos)

  return (
    <>
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <TarjetasDeAjustes etiqueta="Ajustes de la empresa">
        <TarjetaEditable
          titulo="Identidad"
          panel="identidad"
          motivo={motivo}
          abrir={paneles.identidad.abrir}
        >
          <ValoresDeLaTarjeta
            filas={filasDeIdentidad(ajustes, props.logoUrl, props.logoOscuroUrl)}
          />
        </TarjetaEditable>
        <TarjetaEditable
          titulo="Región"
          panel="region"
          motivo={motivo}
          abrir={paneles.region.abrir}
        >
          <ValoresDeLaTarjeta filas={filasDeRegion(ajustes, conDatosCargados)} />
        </TarjetaEditable>
        <TarjetaEditable
          titulo="Datos legales y de contacto"
          panel="datos-legales"
          motivo={motivo}
          abrir={paneles.legales.abrir}
        >
          <ValoresDeLaTarjeta filas={filasDeDatosLegales(ajustes)} />
        </TarjetaEditable>
        <TarjetaEditable
          titulo="Políticas"
          panel="politicas"
          motivo={motivo}
          abrir={paneles.politicas.abrir}
        >
          <ValoresDeLaTarjeta filas={filasDePoliticas(ajustes)} />
        </TarjetaEditable>
        <TarjetaDeIconos props={props} motivo={motivos.iconos} abrir={paneles.iconos.abrir} />
      </TarjetasDeAjustes>
      <ModalesDeLaEmpresa props={props} paneles={paneles} />
    </>
  )
}
