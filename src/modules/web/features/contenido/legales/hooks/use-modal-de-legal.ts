'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import type { DocumentoDelSitio } from '../../../../entities/contenido/documento-limpio'
import {
  TEXTOS_DE_LEGALES,
  legalesInvalidos,
  type ClaveDeLegal,
  type LegalGuardado,
} from '../../../../entities/contenido/legales'
import { guardarLegales } from '../actions/guardar-legales'

type Opciones = {
  clave: ClaveDeLegal
  // Lo guardado de este documento (o `null`: aún no existe) y la versión de la fila de ajustes: llegan por props y nunca van en la `key`.
  guardado: LegalGuardado | null
  actualizadoEn: string
  abierto: boolean
  alCerrar: () => void
}

type Valores = { titulo: string; doc: DocumentoDelSitio | null }

// El modal de un documento legal: su título y su texto con el borrador en `sessionStorage` (un texto largo no se pierde al cerrar sin querer: al volver
// se repone y se avisa con «Descartar»). Manda sólo este documento: la base conserva el otro y su fecha. Vaciar un documento ya guardado no se puede
// (`legalesInvalidos`): el motivo va junto al texto.
export function useModalDeLegal({ clave, guardado, actualizadoEn, abierto, alCerrar }: Opciones) {
  const inicial: Valores = {
    titulo: guardado?.titulo ?? TEXTOS_DE_LEGALES[clave].titulo,
    doc: guardado?.doc ?? null,
  }
  const [valores, setValores] = useState<Valores>(inicial)
  const hayCambios =
    valores.titulo.trim() !== inicial.titulo ||
    JSON.stringify(valores.doc) !== JSON.stringify(inicial.doc)

  const borrador = useBorradorDeEstado<Valores>({
    clave: `web-legal-${clave}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: actualizadoEn,
    validar: () => {
      const porCampo = legalesInvalidos(
        { [clave]: valores },
        { terminos: null, privacidad: null, [clave]: guardado },
      )
      return Object.keys(porCampo).length === 0 ? null : (porCampo as Record<string, string>)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(
            guardarLegales({ actualizadoEnEsperado: actualizadoEn, [clave]: valores }),
            'No se pudo guardar el documento.',
          )
        : { ok: true, data: { actualizadoEn } },
    alGuardar: () => {
      borrador.limpiar()
      avisarExito(`${TEXTOS_DE_LEGALES[clave].titulo} guardado`)
      alCerrar()
    },
  })

  return {
    formulario: { ...formulario, descartarBorrador: borrador.limpiar },
    valores,
    cambiarTitulo: (titulo: string) => {
      setValores((antes) => ({ ...antes, titulo }))
      formulario.quitarMotivo(`${clave}Titulo`)
    },
    cambiarDocumento: (doc: DocumentoDelSitio | null) => {
      setValores((antes) => ({ ...antes, doc }))
      formulario.quitarMotivo(clave)
      formulario.quitarMotivo('legales')
    },
  }
}
