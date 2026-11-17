import 'server-only'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_PARA_COMPARTIR, type ParaCompartir } from '../../entities/compartir-tipos-cambio'
import type { LectorParaCompartir } from '../../entities/repositorios'
import { esquemaDeTipoCambioVigente, vigentesDesde } from '../../entities/tipos-cambio-vigentes'

const esquemaDeLaLectura = esquemaDeTipoCambioVigente.array()

// Lo que se comparte, con la sesión de quien pide (la RLS y `tipos_cambio_vigentes()` deciden: una cuenta que no está activa no recibe filas).
// Los vigentes salen de la misma RPC del popover (hasta 30 + 1, por `tipos_cambio_vigentes()`); lo elegido se filtra acá, en el orden pedido, y
// lo que ya no está activo se omite. Los datos de la empresa, de la fila única `ajustes_empresa` (por su clave primaria). `leerAjustes()` no
// sirve: trae también si hay datos cargados; y los ajustes de fábrica nunca: lo que va a un cliente no sale con otro nombre o locale.
export const getParaCompartir: LectorParaCompartir = async (ids) => {
  const supabase = await createClient()
  const [vigentes, empresa] = await Promise.all([
    supabase.rpc('tipos_cambio_vigentes').limit(TOPE_PARA_COMPARTIR + 1),
    supabase
      .from('ajustes_empresa')
      .select('nombre, logo_ruta, color_acento, locale, zona_horaria, leyenda_tipos_cambio')
      .eq('id', 1)
      .single(),
  ])
  if (vigentes.error) {
    return { ok: false, error: errorDePostgrest(vigentes.error) }
  }
  if (empresa.error) {
    return { ok: false, error: errorDePostgrest(empresa.error) }
  }
  const filas = esquemaDeLaLectura.safeParse(vigentes.data)
  if (!filas.success) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  const porId = new Map(vigentesDesde(filas.data).map((tipo) => [tipo.id, tipo]))
  const tipos = ids.flatMap((id) => {
    const tipo = porId.get(id)
    return tipo
      ? [
          {
            id: tipo.id,
            nombre: tipo.nombre,
            monedaDe: tipo.monedaDe,
            monedaA: tipo.monedaA,
            valor: tipo.valor,
          },
        ]
      : []
  })
  if (tipos.length === 0) {
    return fallo('no_encontrado', 'Esos tipos de cambio ya no están activos.')
  }
  const paraCompartir: ParaCompartir = {
    empresa: empresa.data.nombre,
    logoUrl: urlPublicaONull('marca', empresa.data.logo_ruta),
    colorAcento: empresa.data.color_acento,
    locale: empresa.data.locale,
    zonaHoraria: empresa.data.zona_horaria,
    ahora: new Date().toISOString(),
    leyenda: empresa.data.leyenda_tipos_cambio,
    tipos,
  }
  return ok(paraCompartir)
}
