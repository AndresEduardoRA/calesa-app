// Lo que prepara `e2e/configuracion-cotizacion-tarjeta-excel.spec.ts` (T325, el editor de la tarjeta como Excel): un origen con una copia de la fórmula v1 de
// `subasta_usa` (con variante: «Transporte» a Chile no aplica con la gasolina), una cotización de referencia de ese origen, un borrador chico de la forma 2 y un
// color del catálogo con el que el texto no se lee (el aviso suave de contraste); otro origen con un borrador de la forma 1 (se convierte al abrirlo). Quien
// configura ve las cotizaciones del origen (la referencia es la más reciente que ve). Todo lleva la raíz `tjexcel` y se borra con `limpiarTerrenoExcel()`.
import type { PlantillaEnCuadricula } from '../../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import { CONTRASENA } from './alta'
import {
  PREFIJO_ROL_E2E,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './base'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './origenes'
import { plantillaValida, sembrarBorradorDePlantilla } from './plantilla'
import { literal, sql } from './sql'
import { copiarLaFormulaDeLaSubasta } from './tarjeta-cuadricula'

const RAIZ = 'tjexcel'
export const COLOR_SIN_CONTRASTE = 'e2e_excel_gris'

export type TerrenoExcel = {
  origen: { id: string; nombre: string }
  // El origen con un borrador de la forma 1.
  deLaForma1: { id: string; nombre: string }
  configuradora: string
}

// La forma 2 de la que parte el editor: un título, una fila de tres celdas vacías para elegir un rango, el remate (etiqueta y monto), el transporte a Chile (no aplica
// con la gasolina; nace sin ocultarse) y el total en negrita con fondo verde.
export const PLANTILLA_DE_PARTIDA: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [
    { id: 'concepto', ancho: 190 },
    { id: 'monto', ancho: 130 },
    { id: 'leyenda', ancho: 170 },
  ],
  filas: [
    { id: 'f_titulo', alto: 28, ocultar_si: 'nunca' },
    { id: 'f_rango', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_remate', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_chile', alto: 24, ocultar_si: 'nunca' },
    { id: 'f_total', alto: 28, ocultar_si: 'nunca' },
  ],
  celdas: [
    {
      id: 'c_titulo',
      fila: 'f_titulo',
      columna: 'concepto',
      abarca_columnas: 3,
      contenido: { tipo: 'texto', texto: 'Cotización de prueba' },
    },
    {
      id: 'c_remate',
      fila: 'f_remate',
      columna: 'concepto',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' },
    },
    {
      id: 'c_remate_monto',
      fila: 'f_remate',
      columna: 'monto',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' },
    },
    {
      id: 'c_chile',
      fila: 'f_chile',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'Transporte a Chile' },
    },
    {
      id: 'c_chile_monto',
      fila: 'f_chile',
      columna: 'monto',
      contenido: { tipo: 'dato', nodo: 'transporte_chile', mostrar: 'monto' },
    },
    {
      id: 'c_total',
      fila: 'f_total',
      columna: 'concepto',
      contenido: { tipo: 'texto', texto: 'TOTAL' },
      estilo: { negrita: true, fondo: 'verde' },
    },
    {
      id: 'c_total_monto',
      fila: 'f_total',
      columna: 'monto',
      contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
    },
  ],
}

const misOrigenes = () =>
  `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`

export function limpiarTerrenoExcel(): void {
  sql(`
    delete from public.cotizaciones where origen_id in (${misOrigenes()});
    delete from public.origenes where id in (${misOrigenes()});
    delete from public.tonos where clave = ${literal(COLOR_SIN_CONTRASTE)}`)
}

async function origenConLaSubasta(proyecto: string, resto: string) {
  const origen = await crearOrigenDePrueba(
    `E2E tarjeta ${resto} ${proyecto}`,
    `${RAIZ}${resto}_${proyecto}`,
    {
      tipo: 'subasta',
    },
  )
  copiarLaFormulaDeLaSubasta(origen.id)
  return origen
}

// Un gris medio: ni el negro ni el blanco llegan a 4,5:1 sobre él.
function sembrarColorSinContraste(): void {
  sql(`
    insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
    values (${literal(COLOR_SIN_CONTRASTE)}, 'Gris e2e excel', '#808080', '#808080', '#666666', '#1b2130', '#808080', '#999999', '#ffffff')
    on conflict do nothing`)
}

// La cotización de referencia: una sembrada (lo guardado, como el PDF) con la variante gasolina.
function sembrarLaReferencia(origenId: string, creadoPor: string): void {
  sembrarCotizaciones({ origenId, creadoPor, cuantas: 1 })
  sql(`
    update public.cotizaciones set valores = valores || '{"variante": "gasolina"}'::jsonb
    where origen_id = ${literal(origenId)}::uuid`)
}

export async function prepararTerrenoExcel(proyecto: string): Promise<TerrenoExcel> {
  limpiarTerrenoExcel()
  const origen = await origenConLaSubasta(proyecto, '')
  const deLaForma1 = await origenConLaSubasta(proyecto, 'f1')
  // Alguien que gestiona el equipo tiene que existir antes de dar de alta a otra persona.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-excel-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Excel',
  })
  const configuradora = correoDePrueba(`configura-excel-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Excel',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Excel ${proyecto}`, clave: `e2e_excel_${proyecto}` },
    permisos: [origen.id, deLaForma1.id].flatMap((id) => [
      { clave: 'cotizaciones.configurar', origenId: id },
      { clave: 'cotizaciones.ver', origenId: id },
    ]),
  })
  sembrarColorSinContraste()
  sembrarLaReferencia(origen.id, idDePersona(configuradora))
  sembrarBorradorDePlantilla(origen.id, PLANTILLA_DE_PARTIDA)
  // La forma 1 más corta del juego: la conversión la abre como cuadrícula.
  sembrarBorradorDePlantilla(deLaForma1.id, { ...plantillaValida('excel'), grupos: [] })
  return { origen, deLaForma1, configuradora }
}

// Lo guardado del origen (el borrador o la publicada), como texto JSON de la base.
export function definicionGuardada(origenId: string, estado: 'borrador' | 'publicada'): unknown {
  const fila = sql(`
    select definicion from public.plantillas_tarjeta
    where origen_id = ${literal(origenId)}::uuid and estado = ${literal(estado)}`)
  return fila === '' ? null : JSON.parse(fila)
}
