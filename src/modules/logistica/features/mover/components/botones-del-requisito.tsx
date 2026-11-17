'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { Button, buttonVariants } from '@/shared/ui/button'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista/mas-acciones'
import type { AccionADibujar, AccionesADibujar } from '../../../entities/mover/acciones-a-dibujar'

type Props = {
  dibujar: AccionesADibujar
  // El nombre del requisito («BL»): nombra el «⋯».
  etiqueta: string
  requisitoId: string
  hacer: (accion: AccionADibujar, requisitoId: string) => void
  // La línea viva que dice «Sin conexión…»: los botones apagados la nombran.
  idSinConexion: string
}

// Del mismo alto que el atajo de antes: no agranda la tarjeta (44 px en el celular).
const CLASE_DEL_BOTON = 'min-h-11 md:min-h-7'

function lineasDelMenu(
  { mas, pedido, principal, apagadas }: AccionesADibujar,
  alElegir: (accion: AccionADibujar) => void,
): AccionDeMenu[] {
  const lineas: AccionDeMenu[] = mas.map((accion, i) => ({
    tipo: 'accion',
    clave: `${accion.tipo}-${String(i)}`,
    etiqueta: accion.etiqueta,
    deshabilitada: apagadas,
    // «Pedirlo» abre un modal: espera a que el menú se cierre, o el foco que vuelve al botón lo cierra.
    despuesDeCerrar: accion.tipo === 'pedir',
    alElegir: () => {
      alElegir(accion)
    },
  }))
  return principal && pedido
    ? [...lineas, { tipo: 'nota', clave: 'pedido', texto: pedido }]
    : lineas
}

function Principal({
  accion,
  apagada,
  idSinConexion,
  alElegir,
}: {
  accion: AccionADibujar
  apagada: boolean
  idSinConexion: string
  alElegir: () => void
}) {
  if (accion.tipo === 'ir' && !apagada) {
    return (
      <Link
        href={accion.ruta as Route}
        aria-label={accion.nombre}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), CLASE_DEL_BOTON)}
      >
        {accion.etiqueta}
      </Link>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={CLASE_DEL_BOTON}
      aria-label={accion.nombre}
      disabled={apagada}
      aria-describedby={apagada ? idSinConexion : undefined}
      onClick={alElegir}
    >
      {accion.etiqueta}
    </Button>
  )
}

// Lo que destraba un requisito que falta (`docs/GLOSARIO.md` › «Acción del requisito»): un botón chico con el verbo (el nombre accesible lleva el objeto) y, si hay
// más, el «⋯» del requisito. Sin ninguna, el pedido a administración va en la línea; con principal, como nota del «⋯». Sin red, todo apagado.
export function BotonesDelRequisito({
  dibujar,
  etiqueta,
  requisitoId,
  hacer,
  idSinConexion,
}: Props) {
  const { principal, pedido, apagadas } = dibujar
  const lineas = lineasDelMenu(dibujar, (accion) => {
    hacer(accion, requisitoId)
  })
  if (principal === null && lineas.length === 0) {
    return pedido ? <span className="ml-auto text-(--color-ink-soft)">{pedido}</span> : null
  }
  return (
    <span className="ml-auto flex items-center gap-1">
      {principal ? (
        <Principal
          accion={principal}
          apagada={apagadas}
          idSinConexion={idSinConexion}
          alElegir={() => {
            hacer(principal, requisitoId)
          }}
        />
      ) : null}
      {lineas.length > 0 ? <MasAcciones nombre={`«${etiqueta}»`} acciones={lineas} /> : null}
    </span>
  )
}
