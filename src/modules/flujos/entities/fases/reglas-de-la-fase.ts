// «Reglas que la afectan» en el panel de una fase: cada regla del flujo que deja encender (o no) un interruptor de la fase, si está encendida y si la fase lo
// tiene marcado. Las que no existen en el flujo de repuestos no se nombran. Sin I/O.
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../flujo'
import {
  ETIQUETA_DEL_CAMPO_CON_REGLA,
  NOMBRE_DE_LA_REGLA,
  REGLA_DEL_INTERRUPTOR,
  SIN_REGLA_EN_REPUESTOS,
  contextoDelFlujo,
  reglaEncendida,
  type CampoConRegla,
} from './reglas-de-fase'

type ReglaDelInterruptor = (typeof REGLA_DEL_INTERRUPTOR)[CampoConRegla]

export type ReglaQueAfecta = {
  regla: ReglaDelInterruptor
  nombre: string
  activa: boolean
  campo: CampoConRegla
  etiquetaDelCampo: string
  // La fase tiene el interruptor encendido (con la regla apagada, de antes).
  encendidoEnLaFase: boolean
}

const VALOR_EN_LA_FASE: Record<
  CampoConRegla,
  keyof Pick<FaseParaConfigurar, 'publicaWeb' | 'visiblePortal' | 'permiteAduana' | 'esLogistica'>
> = {
  publica_web: 'publicaWeb',
  visible_portal: 'visiblePortal',
  permite_aduana: 'permiteAduana',
  es_logistica: 'esLogistica',
}

const CAMPOS = Object.keys(REGLA_DEL_INTERRUPTOR) as CampoConRegla[]

export function reglasQueAfectanALaFase(
  flujo: Pick<FlujoParaConfigurar, 'ambito' | 'reglas' | 'origenEsSubasta'>,
  fase: FaseParaConfigurar,
): ReglaQueAfecta[] {
  const contexto = contextoDelFlujo(flujo)
  return CAMPOS.filter(
    (campo) => !(flujo.ambito === 'repuestos' && SIN_REGLA_EN_REPUESTOS.includes(campo)),
  ).map((campo) => {
    const regla = REGLA_DEL_INTERRUPTOR[campo]
    return {
      regla,
      nombre: NOMBRE_DE_LA_REGLA[regla],
      activa: reglaEncendida(contexto, regla),
      campo,
      etiquetaDelCampo: ETIQUETA_DEL_CAMPO_CON_REGLA[campo],
      encendidoEnLaFase: fase[VALOR_EN_LA_FASE[campo]],
    }
  })
}

// La frase de una regla: qué deja hacer en la fase y, si está apagada con el interruptor encendido de antes, que sigue marcado.
export function textoDeLaRegla(r: ReglaQueAfecta): string {
  if (r.activa) {
    return `La regla «${r.nombre}» está encendida: la fase puede marcar «${r.etiquetaDelCampo}».`
  }
  const base = `La regla «${r.nombre}» está apagada: «${r.etiquetaDelCampo}» no se puede encender.`
  return r.encendidoEnLaFase ? `${base} La fase la tiene marcada de antes.` : base
}
