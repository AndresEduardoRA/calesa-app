'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { Grupo } from '../../../../../entities/formula'
import type { OpcionDeTipoDeCambio } from '../../../../../entities/formula/buckets'
import type {
  CambiosDelGrupo,
  CampoDelGrupo,
  ContextoDelGrupo,
  ErrorDelGrupo,
} from '../../../../../entities/formula/grupos'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { useMiembrosDelGrupo } from '../../../hooks/use-miembros-del-grupo'
import type { EstadoDeLosTonos } from '../../../hooks/use-tonos'
import { FilasDelGrupo, type FilaCandidata, type FilaDelGrupo } from './filas-del-grupo'

type Props = {
  grupo: Grupo
  // Sus filas al abrir y todas las que pueden sumar, en el orden de la fórmula.
  miembros: readonly FilaDelGrupo[]
  candidatas: readonly FilaCandidata[]
  errores: readonly ErrorDelGrupo[]
  tonos: EstadoDeLosTonos
  tiposDeCambio: readonly OpcionDeTipoDeCambio[]
  // El diseño de la versión leída tiene modos de tipo de cambio: la hoja usa los del modo.
  conModos: boolean
  alAplicar: (cambios: CambiosDelGrupo, contexto: ContextoDelGrupo) => void
  alCancelar: () => void
  alReintentarTonos: () => void
  // «Crear banda» al crearla.
  etiquetaDeAplicar?: string
}

const ORDEN: CampoDelGrupo[] = ['etiqueta', 'plazo', 'tono', 'tipo_de_cambio', 'miembros']

function opcionesDeTono(tonos: EstadoDeLosTonos, actual: string) {
  if (tonos.tipo === 'leyendo') return [{ valor: actual, etiqueta: 'Cargando los colores…' }]
  if (tonos.tipo === 'error') return [{ valor: actual, etiqueta: actual }]
  const opciones = tonos.tonos.map((t) => ({ valor: t.clave, etiqueta: t.nombre }))
  // Un tono que ya no está en el catálogo se ve por su clave y no deja aplicar hasta elegir otro.
  return tonos.claves.has(actual) ? opciones : [{ valor: actual, etiqueta: actual }, ...opciones]
}

function EstadoDeLosTonosDelFormulario({
  tonos,
  alReintentar,
}: {
  tonos: EstadoDeLosTonos
  alReintentar: () => void
}) {
  if (tonos.tipo === 'listo') return null
  if (tonos.tipo === 'leyendo') {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Esperando los tonos de la empresa.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-peligro-ink)">
      <p role="alert">No se pudieron leer los colores de la empresa.</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={alReintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}

function CamposDeTexto(p: {
  uid: string
  etiqueta: string
  plazo: string
  deError: (campo: CampoDelGrupo) => string | undefined
  alCambiarEtiqueta: (etiqueta: string) => void
  alCambiarPlazo: (plazo: string) => void
}) {
  return (
    <>
      <Campo
        nombre={`${p.uid}-etiqueta`}
        etiqueta="Etiqueta"
        value={p.etiqueta}
        error={p.deError('etiqueta')}
        onChange={(evento) => {
          p.alCambiarEtiqueta(evento.target.value)
        }}
      />
      <Campo
        nombre={`${p.uid}-plazo`}
        etiqueta="Plazo de pago"
        placeholder="2 días"
        value={p.plazo}
        error={p.deError('plazo')}
        ayuda="Opcional."
        onChange={(evento) => {
          p.alCambiarPlazo(evento.target.value)
        }}
      />
    </>
  )
}

function SelectoresDelGrupo(p: {
  uid: string
  tono: string
  tipoDeCambio: string
  tonos: EstadoDeLosTonos
  tiposDeCambio: readonly OpcionDeTipoDeCambio[]
  conModos: boolean
  deError: (campo: CampoDelGrupo) => string | undefined
  alCambiarTono: (tono: string) => void
  alCambiarTipoDeCambio: (id: string) => void
}) {
  return (
    <>
      <CampoSeleccion
        nombre={`${p.uid}-tono`}
        etiqueta="Color"
        opciones={opcionesDeTono(p.tonos, p.tono)}
        value={p.tono}
        disabled={p.tonos.tipo !== 'listo'}
        error={p.deError('tono')}
        ayuda="La tarjeta usa el color que elija su plantilla, si elige uno."
        onChange={(evento) => {
          p.alCambiarTono(evento.target.value)
        }}
      />
      <CampoSeleccion
        nombre={`${p.uid}-tipo_de_cambio`}
        etiqueta="Tipo de cambio"
        opciones={p.tiposDeCambio.map((o) => ({
          valor: o.id,
          etiqueta: `${o.etiqueta} (${o.clave})`,
          ...(o.motivo === null ? {} : { deshabilitada: true }),
        }))}
        value={p.tipoDeCambio}
        error={p.deError('tipo_de_cambio')}
        ayuda={
          p.conModos ? 'En la hoja, cada modo elige el tipo de cambio de cada banda.' : undefined
        }
        onChange={(evento) => {
          p.alCambiarTipoDeCambio(evento.target.value)
        }}
      />
    </>
  )
}

const mismos = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

// Lo que se va eligiendo y si difiere de lo que tenía al abrir.
function useEstadoDelGrupo({ grupo, miembros, candidatas, tiposDeCambio }: Props) {
  const filas = useMiembrosDelGrupo(miembros, candidatas)
  const [etiqueta, setEtiqueta] = useState(grupo.etiqueta)
  const [plazo, setPlazo] = useState(grupo.plazo ?? '')
  const [tono, setTono] = useState(grupo.tono)
  const [inicial] = useState(
    () => tiposDeCambio.find((o) => o.buckets.includes(grupo.bucket))?.id ?? '',
  )
  const [tipoDeCambio, setTipoDeCambio] = useState(inicial)
  const hayCambios =
    etiqueta !== grupo.etiqueta ||
    plazo !== (grupo.plazo ?? '') ||
    tono !== grupo.tono ||
    tipoDeCambio !== inicial ||
    !mismos(
      filas.ids,
      miembros.map((m) => m.id),
    )
  return {
    filas,
    etiqueta,
    setEtiqueta,
    plazo,
    setPlazo,
    tono,
    setTono,
    tipoDeCambio,
    setTipoDeCambio,
    hayCambios,
  }
}

// El formulario de una banda (el panel de la banda, D13): etiqueta, plazo de pago, color, tipo de cambio y sus filas, sin campo de id. «Aplicar» (o Enter en un campo)
// aplica; un error queda junto a su campo, con lo escrito y el foco en el primero. Sin el catálogo de colores leído, «Aplicar» espera. Cerrar con algo cambiado
// pregunta (no tiene borrador).
export function FormularioDelGrupo(props: Props) {
  const { grupo, miembros, errores, tonos, tiposDeCambio, conModos, alCancelar } = props
  const uid = useId()
  const {
    filas,
    etiqueta,
    setEtiqueta,
    plazo,
    setPlazo,
    tono,
    setTono,
    tipoDeCambio,
    setTipoDeCambio,
    hayCambios,
  } = useEstadoDelGrupo(props)
  const deError = (campo: CampoDelGrupo) => errores.find((e) => e.campo === campo)?.mensaje
  useCambiosSinGuardar(hayCambios, undefined, { preguntaAlCerrar: true })

  // Al abrir el foco va a la etiqueta; con errores nuevos, al primero.
  useEffect(() => {
    const primero = ORDEN.find((c) => errores.some((e) => e.campo === c)) ?? 'etiqueta'
    document.getElementById(`${uid}-${primero}`)?.focus()
  }, [uid, errores])

  const listo = tonos.tipo === 'listo'
  return (
    <form
      id={`${uid}-formulario`}
      aria-label={grupo.etiqueta === '' ? 'Nueva banda' : `Banda ${grupo.etiqueta}`}
      className="grid min-w-0 gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (tonos.tipo !== 'listo') return
        props.alAplicar(
          { etiqueta, plazo, tono, tipoDeCambio, miembros: filas.ids },
          { tonos: tonos.claves, conModos },
        )
      }}
    >
      {deError('grupo') ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {deError('grupo')}
        </p>
      ) : null}
      <CamposDeTexto
        uid={uid}
        etiqueta={etiqueta}
        plazo={plazo}
        deError={deError}
        alCambiarEtiqueta={setEtiqueta}
        alCambiarPlazo={setPlazo}
      />
      <SelectoresDelGrupo
        uid={uid}
        tono={tono}
        tipoDeCambio={tipoDeCambio}
        tonos={tonos}
        tiposDeCambio={tiposDeCambio}
        conModos={conModos}
        deError={deError}
        alCambiarTono={setTono}
        alCambiarTipoDeCambio={setTipoDeCambio}
      />
      <FilasDelGrupo
        uid={uid}
        originales={miembros}
        quedan={filas.quedan}
        candidatas={filas.libres}
        error={deError('miembros')}
        alQuitar={filas.quitar}
        alSumar={filas.sumar}
      />
      <EstadoDeLosTonosDelFormulario tonos={tonos} alReintentar={props.alReintentarTonos} />
      <PieDelPanel
        idFormulario={`${uid}-formulario`}
        enCurso={false}
        alCancelar={alCancelar}
        etiquetaDeGuardar={props.etiquetaDeAplicar ?? 'Aplicar'}
        sinPuedeEnviar={!listo}
      />
    </form>
  )
}
