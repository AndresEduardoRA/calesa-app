'use client'

import { useId, useState, type Dispatch, type SetStateAction } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { Checkbox } from '@/shared/ui/checkbox'
import { Interruptor } from '@/shared/ui/interruptor'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { avisoDeOrigenApagado, origenesAGuardar } from '../../../../entities/sitio/ajustes'
import { useEnvioDelSitio } from '../hooks/use-envio-del-sitio'
import { CONFLICTO_DE_AJUSTES_DEL_SITIO, type PropsDeModalDelSitio } from './modal-de-identidad'

export type PropsDeModalDeVitrina = PropsDeModalDelSitio & {
  // Los orígenes activos (los compone la página: `web` no importa `origenes`).
  origenes: readonly { id: string; nombre: string }[]
  // Por origen que hoy se ve: cuántos vehículos publicados dejan de verse al apagarlo (`null`: no se pudo leer).
  conteos: Record<string, ConteoAcotado | null>
}

// «Vitrina» (`?panel=vitrina`): qué orígenes se ven en la web y si los precios van también en la moneda secundaria. Destildar uno que hoy se ve avisa
// cuántos vehículos publicados dejan de verse, antes de guardar. Cada apertura empieza de lo guardado.
export function ModalDeVitrina(props: PropsDeModalDeVitrina) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeVitrina key={apertura} {...props} />
}

const mismos = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

function FormularioDeVitrina({
  abierto,
  alCerrar,
  ajustes,
  origenes,
  conteos,
}: PropsDeModalDeVitrina) {
  const visibles = origenes
    .map((origen) => origen.id)
    .filter((otro) => ajustes.origenesVisibles.includes(otro))
  const [tildados, setTildados] = useState<string[]>(visibles)
  const [moneda, setMoneda] = useState(ajustes.mostrarMonedaSecundaria)
  const formulario = useEnvioDelSitio({
    ajustes,
    abierto,
    alCerrar,
    cambios: {
      mostrarMonedaSecundaria: moneda,
      origenesVisibles: origenesAGuardar(
        ajustes.origenesVisibles,
        origenes.map((origen) => origen.id),
        tildados,
      ),
    },
    hayCambios: moneda !== ajustes.mostrarMonedaSecundaria || !mismos(visibles, tildados),
  })
  return (
    <ModalDeFormulario
      id="sitio-vitrina"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Vitrina"
      descripcion="Lo que la web muestra del inventario."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_AJUSTES_DEL_SITIO}
    >
      <OrigenesDeLaVitrina
        origenes={origenes}
        conteos={conteos}
        ajustes={ajustes}
        tildados={tildados}
        setTildados={setTildados}
        formulario={formulario}
      />
      <Interruptor
        titulo="Mostrar la moneda secundaria"
        ayuda="El sitio muestra cada precio también en la moneda secundaria."
        valor={moneda}
        alCambiar={setMoneda}
        deshabilitado={formulario.enCurso}
      />
    </ModalDeFormulario>
  )
}

type PropsDeOrigenes = Pick<PropsDeModalDeVitrina, 'origenes' | 'conteos' | 'ajustes'> & {
  tildados: string[]
  setTildados: Dispatch<SetStateAction<string[]>>
  formulario: Pick<ReturnType<typeof useEnvioDelSitio>, 'errores' | 'enCurso' | 'quitarMotivo'>
}

// Los orígenes, uno por casilla; destildar uno que hoy se ve avisa cuántos vehículos dejan de verse.
function OrigenesDeLaVitrina({
  origenes,
  conteos,
  ajustes,
  tildados,
  setTildados,
  formulario,
}: PropsDeOrigenes) {
  const id = useId()
  const error = formulario.errores['origenesVisibles']
  return (
    <fieldset
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
      className="grid min-w-0 gap-1 border-0 p-0"
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        Orígenes que se ven en la web
      </legend>
      {error ? (
        <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      {origenes.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no hay orígenes activos.
        </p>
      ) : (
        origenes.map((origen) => {
          const tildado = tildados.includes(origen.id)
          const aviso =
            !tildado && ajustes.origenesVisibles.includes(origen.id)
              ? avisoDeOrigenApagado(origen.nombre, conteos[origen.id] ?? null)
              : null
          return (
            <div key={origen.id} className="grid gap-1">
              <label
                htmlFor={`${id}-${origen.id}`}
                className="flex min-h-11 items-center gap-2 text-(length:--text-sm) break-words md:min-h-0"
              >
                <Checkbox
                  id={`${id}-${origen.id}`}
                  checked={tildado}
                  disabled={formulario.enCurso}
                  onCheckedChange={(marcada) => {
                    setTildados((antes) =>
                      marcada
                        ? [...antes.filter((otro) => otro !== origen.id), origen.id]
                        : antes.filter((otro) => otro !== origen.id),
                    )
                    formulario.quitarMotivo('origenesVisibles')
                  }}
                />
                {origen.nombre}
              </label>
              {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
            </div>
          )
        })
      )}
    </fieldset>
  )
}
