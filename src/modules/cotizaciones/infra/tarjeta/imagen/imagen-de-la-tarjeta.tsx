import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { CSSProperties } from 'react'
import { ImageResponse } from 'next/og'
import { COLOR_TINTA } from '@/shared/config/app'
import { FONDO_AUTOMATICO, RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada, Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import {
  CARPETA_DE_LAS_FUENTES,
  FAMILIA_DE_LA_TARJETA,
  VARIANTES_DE_LAS_FUENTES,
} from '../fuentes-de-la-tarjeta'
import type { LogoDelPdf } from '../pdf/logo-del-pdf'

// La tarjeta de una cotización como imagen PNG (`ImageResponse` de `next/og`, en el servidor: no suma JS a ninguna pantalla), al ancho de la tarjeta en px: la
// misma geometría que la vista previa y el PDF, pintada con posiciones absolutas (satori no tiene `grid` y todo `div` con más de un hijo lleva `display: flex`).
// Geist de la tarjeta; el logo, el que ya bajó y filtró `logoDelPdf()`, como `data:`. La usa la portada de la cotización.

type Fuente = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' | 'italic' }

let fuentes: Promise<Fuente[]> | null = null
function leerFuentes(): Promise<Fuente[]> {
  fuentes ??= Promise.all(
    VARIANTES_DE_LAS_FUENTES.map(async (v) => ({
      name: FAMILIA_DE_LA_TARJETA,
      data: await readFile(path.join(CARPETA_DE_LAS_FUENTES, v.archivo)),
      weight: v.peso,
      style: v.italica ? ('italic' as const) : ('normal' as const),
    })),
  )
  return fuentes
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml' } as const
const JUSTIFICAR = { arriba: 'flex-start', centro: 'center', abajo: 'flex-end' } as const
const ALINEAR = { izquierda: 'left', centro: 'center', derecha: 'right' } as const
const ALINEAR_LOGO = { izquierda: 'flex-start', centro: 'center', derecha: 'flex-end' } as const

const comoDatos = (logo: LogoDelPdf) =>
  `data:${MIME[logo.tipo]};base64,${logo.datos.toString('base64')}`

function estiloDe(c: CeldaDibujada): CSSProperties {
  const e = c.estilo
  const borde = (px: number) => (px === 0 ? 'none' : `${String(px)}px solid ${COLOR_TINTA}`)
  const relleno = (px: number) => Math.max(0, RELLENO_DE_LA_CELDA - px)
  return {
    position: 'absolute',
    left: c.x,
    top: c.y,
    width: c.ancho,
    height: c.alto,
    paddingTop: relleno(e.bordes.arriba),
    paddingRight: relleno(e.bordes.derecha),
    paddingBottom: relleno(e.bordes.abajo),
    paddingLeft: relleno(e.bordes.izquierda),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: JUSTIFICAR[e.alinearVertical],
    overflow: 'hidden',
    backgroundColor: e.fondo,
    color: e.texto,
    fontSize: e.tamano,
    lineHeight: 1.4,
    fontWeight: e.negrita ? 600 : 400,
    fontStyle: e.cursiva ? 'italic' : 'normal',
    textAlign: ALINEAR[e.alinear],
    whiteSpace: 'pre-wrap',
    borderTop: borde(e.bordes.arriba),
    borderRight: borde(e.bordes.derecha),
    borderBottom: borde(e.bordes.abajo),
    borderLeft: borde(e.bordes.izquierda),
  }
}

function Celda({ celda, logo }: { celda: CeldaDibujada; logo: string | null }) {
  const c = celda.contenido
  const ancho = Math.max(1, Math.floor(celda.ancho - 8))
  const alto = Math.max(1, Math.floor(celda.alto - 8))
  return (
    <div style={estiloDe(celda)}>
      {c.tipo === 'texto' && c.lineas.length > 0 ? (
        <div style={{ display: 'flex' }}>{c.lineas.join('\n')}</div>
      ) : null}
      {c.tipo === 'monto' ? <div style={{ display: 'flex' }}>{c.texto}</div> : null}
      {c.tipo === 'monto' && c.segunda !== null ? (
        <div style={{ display: 'flex' }}>{c.segunda.texto}</div>
      ) : null}
      {c.tipo === 'logo' && logo !== null ? (
        <div
          style={{
            display: 'flex',
            justifyContent: ALINEAR_LOGO[celda.estilo.alinear],
            width: ancho,
            height: alto,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse dibuja con satori: no hay next/image. */}
          <img src={logo} width={ancho} height={alto} alt="" style={{ objectFit: 'contain' }} />
        </div>
      ) : null}
    </div>
  )
}

// Los bytes del PNG de la tarjeta: `ancho × alto` px enteros (los de la geometría, hacia arriba).
export async function pngDeLaTarjeta({
  geometria,
  logo,
}: {
  geometria: Geometria
  logo: LogoDelPdf | null
}): Promise<Uint8Array<ArrayBuffer>> {
  const ancho = Math.ceil(geometria.ancho)
  const alto = Math.ceil(geometria.alto)
  const datos = logo === null ? null : comoDatos(logo)
  const respuesta = new ImageResponse(
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: ancho,
        height: alto,
        backgroundColor: FONDO_AUTOMATICO,
        fontFamily: FAMILIA_DE_LA_TARJETA,
      }}
    >
      {geometria.celdas.map((c) => (
        <Celda key={c.id} celda={c} logo={datos} />
      ))}
    </div>,
    { width: ancho, height: alto, fonts: await leerFuentes() },
  )
  return new Uint8Array(await respuesta.arrayBuffer())
}
