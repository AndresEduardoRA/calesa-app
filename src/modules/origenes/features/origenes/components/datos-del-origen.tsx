'use client'

import { useId, useState, type ComponentProps } from 'react'
import { plataformasConocidas } from '@/shared/lib/apibara'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { MOTIVO_SIN_PERMISO_ORIGENES, MOTIVO_TIPO_NO_CAMBIA } from '../../../entities/motivos'
import {
  ETIQUETA_DE_TIPO_DE_ORIGEN,
  huellaDelOrigen,
  type OrigenConUso,
} from '../../../entities/origen'
import { useOrigenes } from '../hooks/use-origenes'
import {
  hayCambiosEnElOrigen,
  useValoresDeOrigen,
  type ValoresDeOrigen,
} from '../hooks/use-valores-de-origen'
import { CamposDeOrigen } from './campos-de-origen'
import { EstadoDelOrigen } from './estado-del-origen'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// Lo que no se edita: el tipo y la clave interna salen de cuando se creó el origen.
function FichaDelOrigen({ origen }: { origen: OrigenConUso }) {
  return (
    <dl className="grid gap-1 text-(length:--text-sm)">
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Tipo</dt>
        <dd className="font-medium text-(--color-ink)">
          {ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}
        </dd>
      </div>
      <div className="flex min-w-0 flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Clave interna</dt>
        <dd className="min-w-0 font-mono break-all text-(--color-ink)">{origen.clave}</dd>
      </div>
      <p className="text-(--color-ink-faint)">{MOTIVO_TIPO_NO_CAMBIA}</p>
    </dl>
  )
}

type PropsDelFormulario = Props & {
  idFormulario: string
  valores: ValoresDeOrigen
  errores: ComponentProps<typeof CamposDeOrigen>['errores']
  alCambiar: (parcial: Partial<ValoresDeOrigen>) => void
  alEnviar: (elemento: HTMLFormElement) => void
}

// El `<form>` de los datos: lo envía «Guardar» de la barra (`form=`).
function Formulario(props: PropsDelFormulario) {
  const { origen, puedeGestionar, idFormulario, valores, errores, alCambiar, alEnviar } = props
  return (
    <form
      id={idFormulario}
      method="post"
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        alEnviar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">Datos de {origen.nombre}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
        <FichaDelOrigen origen={origen} />
        <CamposDeOrigen
          valores={valores}
          alCambiar={alCambiar}
          esDeSubasta={origen.tipo === 'subasta'}
          errores={errores}
          deshabilitado={!puedeGestionar}
        />
      </fieldset>
    </form>
  )
}

// El formulario, lo que se hace con el origen entero (activar, desactivar, eliminar) y la barra de cambios sin guardar, que va al final
// para quedar pegada abajo de la página. Con `puedeGestionar` en falso todo se ve apagado y no hay barra.
function ContenidoDelOrigen({ origen, puedeGestionar }: Props) {
  const idFormulario = useId()
  const ediciones = useOrigenes()
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const guardado = {
    nombre: origen.nombre,
    sustantivo: origen.sustantivo,
    genero: origen.genero,
    color: origen.color,
    plataformas: plataformasConocidas(origen.apibaraPlataformas),
  }
  // El género guardado es una decisión: no se pisa al retocar el sustantivo.
  const { valores, cambiar, reiniciar } = useValoresDeOrigen(guardado, true)
  const errores = ediciones.errores.guardar

  async function guardar(elemento: HTMLFormElement) {
    setErrorDeNombre(undefined)
    const resultado = await ediciones.guardar(
      {
        id: origen.id,
        actualizadoEnEsperado: origen.actualizadoEn,
        nombre: valores.nombre,
        sustantivo: valores.sustantivo,
        genero: valores.genero,
        color: valores.color,
        ...(origen.tipo === 'subasta' ? { plataformas: valores.plataformas } : {}),
      },
      `Origen «${valores.nombre.trim()}» guardado`,
    )
    if (!resultado.ok) {
      if (resultado.error.codigo === 'duplicado') {
        setErrorDeNombre(resultado.error.mensaje)
      }
      enfocarPrimerError(elemento)
    }
  }

  return (
    <div className="grid gap-6">
      <Formulario
        origen={origen}
        puedeGestionar={puedeGestionar}
        idFormulario={idFormulario}
        valores={valores}
        errores={{
          nombre: errorDeNombre ?? errorDeCampo(errores, 'nombre'),
          sustantivo: errorDeCampo(errores, 'sustantivo'),
          color: errorDeCampo(errores, 'color'),
          plataformas: errorDeCampo(errores, 'plataformas'),
        }}
        alCambiar={(parcial) => {
          if (parcial.nombre !== undefined) {
            setErrorDeNombre(undefined)
          }
          cambiar(parcial)
        }}
        alEnviar={(elemento) => void guardar(elemento)}
      />
      <EstadoDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
      {puedeGestionar ? (
        <BarraDeCambiosSinGuardar
          hayCambios={hayCambiosEnElOrigen(valores, guardado)}
          formulario={idFormulario}
          guardando={ediciones.enCurso}
          alDescartar={() => {
            setErrorDeNombre(undefined)
            reiniciar()
          }}
        />
      ) : null}
    </div>
  )
}

// La parte «Datos». Lleva de `key` lo que el formulario muestra (no la versión): desactivar el origen o marcar un dato clave toca la misma
// fila y no le borra lo tipeado; guardar (uno mismo u otra persona) sí lo reinicia desde lo guardado, y la barra se va.
export function DatosDelOrigen({ origen, puedeGestionar }: Props) {
  return (
    <ContenidoDelOrigen
      key={huellaDelOrigen(origen)}
      origen={origen}
      puedeGestionar={puedeGestionar}
    />
  )
}
