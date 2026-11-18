import 'server-only'
// `Image` de react-pdf no es un `<img>` del DOM: no lleva `alt` (el PDF no tiene árbol de accesibilidad con él); el nombre propio evita confundirlo con el de next/image.
import { Document, Image as ImagenDelPdf, Page, Text, View } from '@react-pdf/renderer'
import { COLOR_TINTA } from '@/shared/config/app'
import { escalarGeometria } from '../../../entities/tarjeta/escalar-geometria'
import { RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada, Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { estilos, MARGEN_DEL_PDF, PAGINA_A4 } from './estilos-del-documento'
import type { LogoDelPdf } from './logo-del-pdf'

export type PropsDelDocumento = {
  geometria: Geometria
  // El número de la guardada: el título del PDF.
  numero: number | null
  logo: LogoDelPdf | null
  // El nombre de la empresa: el autor del PDF.
  empresa: string
}

// 1 px de la tarjeta = 0,75 pt.
const PT_POR_PX = 0.75
const JUSTIFICAR = { arriba: 'flex-start', centro: 'center', abajo: 'flex-end' } as const
const ALINEAR = { izquierda: 'left', centro: 'center', derecha: 'right' } as const

// El factor que hace entrar la tarjeta entera en el ancho y el alto útiles de A4 (D15 de T310): nunca agranda, y una fila nunca se corta.
export function escalaDelPdf(g: Geometria): number {
  const ancho = (PAGINA_A4.ancho - 2 * MARGEN_DEL_PDF) / (g.ancho * PT_POR_PX)
  const alto = (PAGINA_A4.alto - 2 * MARGEN_DEL_PDF) / (g.alto * PT_POR_PX)
  return Math.min(1, ancho, alto)
}

function estiloDe(c: CeldaDibujada, k: number) {
  const e = c.estilo
  // El borde va adentro de los 4 px de la celda (`RELLENO_DE_LA_CELDA`): si no, el último renglón no entra y react-pdf lo corta con «…».
  const relleno = (px: number) => Math.max(0, RELLENO_DE_LA_CELDA - px) * k
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
    backgroundColor: e.fondo,
    borderColor: COLOR_TINTA,
    borderTopWidth: e.bordes.arriba * k,
    borderRightWidth: e.bordes.derecha * k,
    borderBottomWidth: e.bordes.abajo * k,
    borderLeftWidth: e.bordes.izquierda * k,
    overflow: 'hidden',
  } as const
}

// El interlineado: 1,4 como el HTML, salvo que sus renglones no entren en el alto de la celda (sin los 4 px de cada lado). react-pdf no dibuja el renglón que no
// entra (el HTML lo recorta un poco): en una fila justa (16 px de letra en 30 px) el concepto y el monto desaparecerían del PDF.
function interlineado(c: CeldaDibujada, k: number, renglones: number): number {
  const alto = c.alto - 2 * RELLENO_DE_LA_CELDA * k
  return Math.max(0.5, Math.min(1.4, (alto - 0.1) / (renglones * c.estilo.tamano)))
}

const estiloDelTexto = (c: CeldaDibujada, k: number, renglones: number) =>
  ({
    color: c.estilo.texto,
    fontSize: c.estilo.tamano,
    lineHeight: interlineado(c, k, renglones),
    fontWeight: c.estilo.negrita ? 600 : 400,
    fontStyle: c.estilo.cursiva ? 'italic' : 'normal',
    textAlign: ALINEAR[c.estilo.alinear],
  }) as const

function Celda({ celda, k, logo }: { celda: CeldaDibujada; k: number; logo: LogoDelPdf | null }) {
  const c = celda.contenido
  return (
    <View style={estiloDe(celda, k)}>
      {c.tipo === 'texto' && c.lineas.length > 0 ? (
        <Text style={estiloDelTexto(celda, k, c.lineas.length)}>{c.lineas.join('\n')}</Text>
      ) : null}
      {c.tipo === 'monto' ? (
        <>
          <Text style={estiloDelTexto(celda, k, c.segunda === null ? 1 : 2)}>{c.texto}</Text>
          {c.segunda === null ? null : (
            <Text style={estiloDelTexto(celda, k, 2)}>{c.segunda.texto}</Text>
          )}
        </>
      ) : null}
      {c.tipo === 'logo' && logo !== null ? (
        <ImagenDelPdf
          src={logo.datos}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : null}
    </View>
  )
}

// La tarjeta de una cotización en una página A4 (D15 de T310): la misma geometría que la vista previa, escalada entera al menor factor que la hace entrar.
// Dibuja la geometría y nada más (no lee, no calcula). Los montos con cifras (`formatearMonto()`, ya en la geometría) aunque Live esté encendido. Los metadatos
// no nombran al cliente, al asesor ni al vehículo: el PDF se reenvía y no se ven al abrirlo.
export function DocumentoDeLaTarjeta({ geometria, numero, logo, empresa }: PropsDelDocumento) {
  const k = escalaDelPdf(geometria)
  const g = escalarGeometria(geometria, PT_POR_PX * k)
  return (
    <Document
      title={numero === null ? 'Cotización' : `Cotización n.º ${String(numero)}`}
      author={empresa}
      creator={empresa}
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={{ position: 'relative', width: g.ancho, height: g.alto }} wrap={false}>
          {g.celdas.map((c) => (
            <Celda key={c.id} celda={c} k={PT_POR_PX * k} logo={logo} />
          ))}
        </View>
      </Page>
    </Document>
  )
}
