'use client'

import { Comentarios } from '../comentarios'

// «Comentarios» del resumen: la misma lista, el mismo campo y los mismos diálogos de la guardada, sin los adjuntos (tienen su pestaña). Comentar, responder, editar y borrar son de la
// base con los permisos de siempre; lo que se escribe aparece también en «Todo» porque esa pestaña lee al abrirse.
export function ComentariosDelResumen({
  cotizacionId,
  puedeAdjuntar,
}: {
  cotizacionId: string
  puedeAdjuntar: boolean
}) {
  return (
    <Comentarios cotizacionId={cotizacionId} puedeAdjuntar={puedeAdjuntar} conAdjuntos={false} />
  )
}
