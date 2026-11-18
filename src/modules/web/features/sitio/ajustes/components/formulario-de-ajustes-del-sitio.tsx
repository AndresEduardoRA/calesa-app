'use client'

import { useRef, useState } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { useBorrador } from '@/shared/ui/use-borrador'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { origenesAGuardar, type AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import {
  CAMPOS_DE_AJUSTES_DEL_SITIO,
  useGuardarAjustesDelSitio,
  type ErroresDeAjustesDelSitio,
} from '../hooks/use-guardar-ajustes-del-sitio'
import { useHayCambiosEnAjustesDelSitio } from '../hooks/use-hay-cambios-en-ajustes-del-sitio'
import { BloqueBuscadores } from './bloque-buscadores'
import { BloqueContacto } from './bloque-contacto'
import { BloqueIdentidad } from './bloque-identidad'
import { BloqueRedes } from './bloque-redes'
import { BloqueVitrina } from './bloque-vitrina'

export type PropsDeAjustesDelSitio = {
  ajustes: AjustesDelSitio
  // Los orígenes activos (los compone la página: `web` no importa `origenes`).
  origenes: readonly { id: string; nombre: string }[]
  // Por origen que hoy se ve: cuántos vehículos publicados dejan de verse al apagarlo (`null`: no se pudo leer).
  conteos: Record<string, ConteoAcotado | null>
}

const ID_DEL_FORMULARIO = 'formulario-ajustes-del-sitio'

// Configuración › Sitio web › Ajustes: identidad, contacto, vitrina, redes y buscadores con una versión, que se guardan con la barra de cambios sin
// guardar. Quien lo usa le pone de `key` la versión de la fila: lo guardado (aquí o por otra persona) lo vuelve a montar desde la base. El borrador guarda
// sólo los campos de texto; las casillas y el interruptor arrancan de lo guardado. «Descartar» vuelve a montar el formulario (`vuelta`): un solo
// camino repone los textos, las casillas y el interruptor.
export function FormularioDeAjustesDelSitio(props: PropsDeAjustesDelSitio) {
  const [vuelta, setVuelta] = useState(0)
  return (
    <FormularioConBarra
      key={vuelta}
      {...props}
      alReiniciar={() => {
        setVuelta((anterior) => anterior + 1)
      }}
    />
  )
}

// El formulario y, como hermana (`order-last`: queda al final de la página, pegada abajo), la barra.
function FormularioConBarra({
  ajustes,
  origenes,
  conteos,
  alReiniciar,
}: PropsDeAjustesDelSitio & { alReiniciar: () => void }) {
  const formulario = useRef<HTMLFormElement>(null)
  const enLinea = useEnLinea()
  const [moneda, setMoneda] = useState(ajustes.mostrarMonedaSecundaria)
  const visibles = origenes
    .map((origen) => origen.id)
    .filter((id) => ajustes.origenesVisibles.includes(id))
  const [tildados, setTildados] = useState<string[]>(visibles)
  const borrador = useBorrador('ajustes-del-sitio', formulario, CAMPOS_DE_AJUSTES_DEL_SITIO)
  const { guardar, recargar, enCurso, conflicto, errores } = useGuardarAjustesDelSitio({
    actualizadoEn: ajustes.actualizadoEn,
    formulario,
    alGuardar: borrador.limpiar,
  })
  const hayCambios = useHayCambiosEnAjustesDelSitio(formulario, {
    moneda: { guardada: ajustes.mostrarMonedaSecundaria, actual: moneda },
    origenes: { guardados: visibles, tildados },
    pausado: enCurso,
  })

  return (
    <>
      <form
        ref={formulario}
        id={ID_DEL_FORMULARIO}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar({
            mostrarMonedaSecundaria: moneda,
            origenesVisibles: origenesAGuardar(
              ajustes.origenesVisibles,
              origenes.map((origen) => origen.id),
              tildados,
            ),
          })
        }}
      >
        {enLinea ? null : (
          <Aviso tono="aviso">
            No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
          </Aviso>
        )}
        {conflicto ? <AvisoDeConflicto mensaje={conflicto} alRecargar={recargar} /> : null}
        <CamposDelSitio
          ajustes={ajustes}
          origenes={origenes}
          conteos={conteos}
          errores={errores}
          enCurso={enCurso}
          tildados={tildados}
          alTildar={(id, tildado) => {
            setTildados((antes) =>
              tildado
                ? [...antes.filter((otro) => otro !== id), id]
                : antes.filter((otro) => otro !== id),
            )
          }}
          moneda={moneda}
          alCambiarMoneda={setMoneda}
        />
      </form>
      <BarraDeCambiosSinGuardar
        className="order-last"
        formulario={ID_DEL_FORMULARIO}
        hayCambios={hayCambios}
        guardando={enCurso}
        alDescartar={() => {
          borrador.limpiar()
          alReiniciar()
        }}
      />
    </>
  )
}

type PropsDeLosCampos = PropsDeAjustesDelSitio & {
  errores: ErroresDeAjustesDelSitio
  enCurso: boolean
  tildados: readonly string[]
  alTildar: (id: string, tildado: boolean) => void
  moneda: boolean
  alCambiarMoneda: (valor: boolean) => void
}

// Los cinco bloques. Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado.
function CamposDelSitio(props: PropsDeLosCampos) {
  const { ajustes, origenes, conteos, errores, enCurso } = props
  return (
    <fieldset disabled={enCurso} className="grid min-w-0 gap-4">
      <legend className="sr-only">Ajustes del sitio</legend>
      <BloqueIdentidad ajustes={ajustes} errores={errores} />
      <BloqueContacto ajustes={ajustes} errores={errores} />
      <BloqueVitrina
        origenes={origenes}
        guardados={ajustes.origenesVisibles}
        tildados={props.tildados}
        alTildar={props.alTildar}
        conteos={conteos}
        mostrarMonedaSecundaria={props.moneda}
        alCambiarMoneda={props.alCambiarMoneda}
        deshabilitado={enCurso}
        errores={errores}
      />
      <BloqueRedes ajustes={ajustes} errores={errores} />
      <BloqueBuscadores ajustes={ajustes} errores={errores} />
    </fieldset>
  )
}
