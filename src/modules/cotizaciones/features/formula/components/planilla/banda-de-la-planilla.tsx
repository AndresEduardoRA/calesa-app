'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import type { Grupo } from '../../../../entities/formula'
import type { OpcionDeTipoDeCambio } from '../../../../entities/formula/buckets'
import type { BandaDeLaPlanilla, OpcionNumerada } from '../../../../entities/formula/planilla'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import type { EstadoDeLosTonos } from '../../hooks/use-tonos'
import { CasillaEnPar } from '../editor/casilla-en-par'
import type { FilaCandidata } from '../editor/filas-del-grupo'
import { FormularioDelGrupo } from '../editor/formulario-del-grupo'
import { LoMovido } from '../editor/grupo-del-editor'
import { SIN_MIEMBROS, type Miembro } from '../editor/miembros-de-los-grupos'
import { CELDA, COLUMNAS, CONCEPTO, DE_DONDE_SALE, NUMERO, PORCENTAJE, VALOR } from './clases'
import { propsDeLaFila, type ContextoDeLasFilas } from './contexto-de-las-filas'
import { FilaDeLaPlanilla } from './fila-de-la-planilla'

// Lo de las bandas que no es de una fila: los grupos (su formulario y sus colores), el permiso de los tipos de cambio y la unidad de ejemplo.
export type ContextoDeLasBandas = {
  tonos: EstadoDeLosTonos
  alReintentarTonos: () => void
  tiposDeCambio: readonly OpcionDeTipoDeCambio[]
  conModos: boolean
  miembros: ReadonlyMap<string, readonly Miembro[]>
  candidatas: readonly FilaCandidata[]
  // La etiqueta del tipo de cambio de un bucket con el modo elegido.
  tipoDeCambioDe: (bucket: string) => string
  puedeCambiarTiposDeCambio: boolean
  enCeros: boolean
  alVolverACeros: () => void
}

type Props = {
  banda: BandaDeLaPlanilla<FilaParaDibujar>
  ctx: ContextoDeLasFilas
  bandas: ContextoDeLasBandas
}

// La cabecera de una banda: a lo ancho, con el contenido pegado a la izquierda al desplazarse de costado y nunca más ancho que el marco.
function Cabecera({
  titulo,
  nota,
  children,
}: {
  titulo: string
  nota?: string
  children?: ReactNode
}) {
  return (
    <tr>
      <th
        colSpan={COLUMNAS}
        scope="colgroup"
        className="border-y border-[color:var(--tono-borde,var(--color-line))] bg-[color:var(--tono-fondo,var(--color-surface-2))] p-0 text-left font-normal text-[color:var(--tono-tinta,var(--color-ink))]"
      >
        <div className="sticky left-0 flex max-w-[100cqw] flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5">
          <span className="font-semibold">{titulo}</span>
          {nota === undefined ? null : <span className="text-(length:--text-xs)">{nota}</span>}
          {children}
        </div>
      </th>
    </tr>
  )
}

// El botón «Editar grupo»: espera (con el motivo de la tabla) mientras haya otra cosa abierta o guardándose.
function EditarGrupo({ grupo, ctx }: { grupo: Grupo; ctx: ContextoDeLasFilas }) {
  const { editor } = ctx
  const bloqueada = !editor.libre
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-[44px] md:pointer-fine:min-h-8"
      aria-label={`Editar el grupo ${grupo.etiqueta}`}
      aria-disabled={bloqueada ? true : undefined}
      aria-describedby={bloqueada ? ctx.idDelMotivo : undefined}
      onClick={() => {
        if (!bloqueada) editor.abrirGrupo(grupo.id)
      }}
    >
      Editar grupo
    </Button>
  )
}

// El rechazo que nombra al grupo y lo que movió su último «Aplicar», bajo su cabecera.
function AvisosDelGrupo({ grupo, ctx }: { grupo: Grupo; ctx: ContextoDeLasFilas }) {
  const { editor } = ctx
  const rechazo = editor.rechazo?.grupoId === grupo.id ? editor.rechazo.mensaje : null
  const movidas = editor.grupos.movidas?.grupoId === grupo.id ? editor.grupos.movidas : null
  if (rechazo === null && movidas === null) return null
  return (
    <tr>
      <td colSpan={COLUMNAS} className={CELDA}>
        {rechazo === null ? null : (
          <p
            role="alert"
            className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)"
          >
            {rechazo}
          </p>
        )}
        {movidas === null ? null : <LoMovido movidas={movidas} />}
      </td>
    </tr>
  )
}

const notaDelGrupo = (grupo: Grupo, tipoDeCambio: string) =>
  [grupo.plazo === undefined ? null : `Plazo: ${grupo.plazo}`, `Tipo de cambio: ${tipoDeCambio}`]
    .filter((x) => x !== null)
    .join(' · ')

function CabeceraDelGrupo({
  grupo,
  ctx,
  bandas,
}: {
  grupo: Grupo
  ctx: ContextoDeLasFilas
  bandas: ContextoDeLasBandas
}) {
  const { editor } = ctx
  const abierto = editor.grupos.abierto?.id === grupo.id ? editor.grupos.abierto : null
  return (
    <>
      <Cabecera
        titulo={grupo.etiqueta}
        nota={notaDelGrupo(grupo, bandas.tipoDeCambioDe(grupo.bucket))}
      >
        {abierto === null ? <EditarGrupo grupo={grupo} ctx={ctx} /> : null}
      </Cabecera>
      <AvisosDelGrupo grupo={grupo} ctx={ctx} />
      {abierto === null ? null : (
        <tr>
          <td colSpan={COLUMNAS} className={CELDA}>
            <FormularioDelGrupo
              grupo={grupo}
              miembros={bandas.miembros.get(grupo.id) ?? SIN_MIEMBROS}
              candidatas={bandas.candidatas}
              errores={abierto.errores}
              tonos={bandas.tonos}
              tiposDeCambio={bandas.tiposDeCambio}
              conModos={bandas.conModos}
              alAplicar={editor.grupos.aplicar}
              alCancelar={editor.grupos.cancelar}
              alReintentarTonos={bandas.alReintentarTonos}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// Una opción de la variante: no es un nodo, sólo se lee (su título es el de la cotización).
function FilaDeLaOpcion({ opcion }: { opcion: OpcionNumerada }) {
  return (
    <tr data-opcion={opcion.clave}>
      <td className={NUMERO}>{opcion.numero}</td>
      <th scope="row" className={CONCEPTO}>
        {opcion.etiqueta}{' '}
        <code className="text-(length:--text-xs) break-all text-(--color-ink-soft)">
          {opcion.clave}
        </code>
      </th>
      <td className={PORCENTAJE} />
      <td className={VALOR}>{opcion.titulo}</td>
      <td className={DE_DONDE_SALE}>{opcion.porDefecto ? 'opción por defecto' : 'opción'}</td>
    </tr>
  )
}

function CabeceraDeLaBanda({ banda, ctx, bandas }: Props) {
  switch (banda.tipo) {
    case 'tipo_cambio':
      return (
        <Cabecera titulo="Tipo de cambio" nota="no se versiona: cambia varias veces por semana">
          {bandas.puedeCambiarTiposDeCambio ? (
            <Link
              href={RUTAS.monedasDeEmpresa as Route}
              className="text-(length:--text-sm) text-(--color-primario-ink) underline"
            >
              Cambiar en Empresa › Monedas
            </Link>
          ) : null}
        </Cabecera>
      )
    case 'unidad':
      return (
        <Cabecera
          titulo="Unidad de ejemplo"
          nota="no se guarda: sirve para ver el efecto de cada cambio"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] md:pointer-fine:min-h-8"
            disabled={bandas.enCeros}
            onClick={bandas.alVolverACeros}
          >
            Volver a ceros
          </Button>
        </Cabecera>
      )
    case 'variante':
      return (
        <Cabecera titulo="Variante" nota={banda.nodo.etiqueta}>
          <CasillaEnPar
            nodo={banda.nodo}
            bloqueada={!ctx.editor.libre}
            alCambiar={ctx.editor.ponerEnPar}
          />
        </Cabecera>
      )
    case 'grupo':
      return <CabeceraDelGrupo grupo={banda.grupo} ctx={ctx} bandas={bandas} />
    case 'sin_grupo':
      return <Cabecera titulo="Sin grupo" />
    default: {
      const _: never = banda
      return _
    }
  }
}

// Una banda de la planilla: su cabecera y sus filas, en un `<tbody>`. La de un grupo lleva su color (`data-tono`): lo toman su cabecera y sus celdas editables.
export function BandaDeLaPlanilla(p: Props) {
  const { banda, ctx } = p
  return (
    <tbody
      data-banda={banda.tipo}
      {...(banda.tipo === 'grupo'
        ? { 'data-tono': banda.grupo.tono, 'data-grupo': banda.grupo.id }
        : {})}
    >
      <CabeceraDeLaBanda {...p} />
      {banda.tipo === 'variante'
        ? banda.opciones.map((o) => <FilaDeLaOpcion key={o.clave} opcion={o} />)
        : banda.filas.map(({ numero, fila }) => (
            <FilaDeLaPlanilla key={fila.id} {...propsDeLaFila(ctx, numero, fila)} />
          ))}
    </tbody>
  )
}
