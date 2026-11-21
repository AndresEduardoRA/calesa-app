import { getAjustes } from '@/modules/empresa'
import {
  leerAjustesDeLeads,
  leerOrigenesDeLeadConUso,
  leerTiposDeLeadConUso,
  leerTiposDeSeguimientoConUso,
} from '@/modules/leads'
import { ConfiguracionDeLeads } from '@/modules/leads/pantallas/configuracion'
import { leerDireccionPublica } from '@/modules/web'
import { datosO } from '@/shared/lib/errores'

// Las seis tarjetas de Configuración › Leads: los tres catálogos completos (también los desactivados, con si algo los usa: a lo sumo 100 cada
// uno, sin paginar), las plantillas y los teléfonos extra. La compone `src/app` (`leads` no importa `empresa` ni `web`): el nombre de la empresa
// y la dirección de la web van al editor del mensaje del portal. Si algo no se puede leer, el `error.tsx` con «Reintentar» (nunca valores de
// fábrica en su lugar: se guardarían encima).
export async function SeccionDeLeads() {
  const [tipos, origenes, seguimientos, ajustes, empresa, direccion] = await Promise.all([
    leerTiposDeLeadConUso(),
    leerOrigenesDeLeadConUso(),
    leerTiposDeSeguimientoConUso(),
    leerAjustesDeLeads(),
    getAjustes(),
    leerDireccionPublica(),
  ])
  return (
    <ConfiguracionDeLeads
      tipos={datosO(tipos)}
      origenes={datosO(origenes)}
      seguimientos={datosO(seguimientos)}
      ajustes={datosO(ajustes)}
      empresa={empresa.nombre}
      direccion={datosO(direccion)}
    />
  )
}
