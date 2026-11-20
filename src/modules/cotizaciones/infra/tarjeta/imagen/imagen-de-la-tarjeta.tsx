import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { CSSProperties } from 'react'
import { ImageResponse } from 'next/og'
import { COLOR_TINTA } from '@/shared/config/app'
import { cajaDelLogo } from '../../../entities/tarjeta/caja-del-logo'
import { circuloDeLasIniciales } from '../../../entities/tarjeta/circulo-de-las-iniciales'
import { FONDO_AUTOMATICO, RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada, Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import {
  CARPETA_DE_LAS_FUENTES,
  FAMILIA_DE_LA_TARJETA,
  VARIANTES_DE_LAS_FUENTES,
} from '../fuentes-de-la-tarjeta'
import type { LogoDeLaTarjeta } from '../logo-de-la-tarjeta'

// La tarjeta de una cotización como imagen PNG (`ImageResponse` de `next/og`, en el servidor: no suma JS a ninguna pantalla), al ancho de la tarjeta en px: la
// misma geometría que la vista previa y el PDF, pintada con posiciones absolutas (satori no tiene `grid` y todo `div` con más de un hijo lleva `display: flex`).
// Geist de la tarjeta; el logo y la foto del asesor, los que ya bajaron y convirtieron `logoParaDibujar()` y `fotoParaDibujar()`, como `data:`, en el rectángulo de
// `cajaDelLogo()`; sin foto, las iniciales en el círculo de `circuloDeLasIniciales()`. La usa la imagen de la tarjeta: si cambias cómo se dibuja, sube
// `VERSION_DEL_DIBUJO` (`entities/tarjeta/etiqueta-de-la-imagen.ts`; si no, el navegador sigue con la que ya tiene).

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

const comoDatos = (logo: LogoDeLaTarjeta) =>
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

type LogoEnDatos = { src: string; ancho: number; alto: number }

const enDatos = (imagen: LogoDeLaTarjeta | null): LogoEnDatos | null =>
  imagen === null ? null : { src: comoDatos(imagen), ancho: imagen.ancho, alto: imagen.alto }

// El logo en la caja interior de su celda: un `div` de ese tamaño y, adentro, el `<img>` en el rectángulo de `cajaDelLogo()` (satori no tiene un `object-position`
// confiable).
function LogoDeLaCelda({ celda, logo }: { celda: CeldaDibujada; logo: LogoEnDatos }) {
  const caja = cajaDelLogo(celda, 1, logo)
  if (caja === null) {
    return null
  }
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: caja.interior.ancho,
        height: caja.interior.alto,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse dibuja con satori: no hay next/image. */}
      <img
        src={logo.src}
        alt=""
        width={caja.logo.ancho}
        height={caja.logo.alto}
        style={{ position: 'absolute', left: caja.logo.x, top: caja.logo.y }}
      />
    </div>
  )
}

// Las iniciales del asesor en su círculo, alineado como la celda en su caja interior.
function InicialesDeLaCelda({ celda, iniciales }: { celda: CeldaDibujada; iniciales: string }) {
  const c = circuloDeLasIniciales(celda, 1)
  if (c === null) {
    return null
  }
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: c.interior.ancho,
        height: c.interior.alto,
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: c.x,
          top: c.y,
          width: c.diametro,
          height: c.diametro,
          alignItems: 'center',
          justifyContent: 'center',
          border: `${String(c.borde)}px solid ${celda.estilo.texto}`,
          borderRadius: c.diametro / 2,
          color: celda.estilo.texto,
          fontSize: c.letra,
          fontWeight: 600,
          fontStyle: 'normal',
          lineHeight: 1,
        }}
      >
        {iniciales}
      </div>
    </div>
  )
}

function Celda({
  celda,
  logo,
  foto,
}: {
  celda: CeldaDibujada
  logo: LogoEnDatos | null
  foto: LogoEnDatos | null
}) {
  const c = celda.contenido
  return (
    <div style={estiloDe(celda)}>
      {c.tipo === 'texto' && c.lineas.length > 0 ? (
        <div style={{ display: 'flex' }}>{c.lineas.join('\n')}</div>
      ) : null}
      {c.tipo === 'monto' ? <div style={{ display: 'flex' }}>{c.texto}</div> : null}
      {c.tipo === 'monto' && c.segunda !== null ? (
        <div style={{ display: 'flex' }}>{c.segunda.texto}</div>
      ) : null}
      {c.tipo === 'logo' && logo !== null ? <LogoDeLaCelda celda={celda} logo={logo} /> : null}
      {c.tipo === 'foto_del_asesor' && foto !== null ? (
        <LogoDeLaCelda celda={celda} logo={foto} />
      ) : null}
      {c.tipo === 'foto_del_asesor' && foto === null ? (
        <InicialesDeLaCelda celda={celda} iniciales={c.iniciales} />
      ) : null}
    </div>
  )
}

// Los bytes del PNG de la tarjeta: `ancho × alto` px enteros (los de la geometría, hacia arriba).
export async function pngDeLaTarjeta({
  geometria,
  logo,
  foto,
}: {
  geometria: Geometria
  logo: LogoDeLaTarjeta | null
  // La foto del asesor; nula, las iniciales.
  foto: LogoDeLaTarjeta | null
}): Promise<Uint8Array<ArrayBuffer>> {
  const ancho = Math.ceil(geometria.ancho)
  const alto = Math.ceil(geometria.alto)
  const datos = enDatos(logo)
  const deLaFoto = enDatos(foto)
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
        <Celda key={c.id} celda={c} logo={datos} foto={deLaFoto} />
      ))}
    </div>,
    { width: ancho, height: alto, fonts: await leerFuentes() },
  )
  return new Uint8Array(await respuesta.arrayBuffer())
}
