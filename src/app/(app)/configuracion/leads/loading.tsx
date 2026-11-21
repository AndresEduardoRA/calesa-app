import { EsqueletoTarjetas } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/leads`: el esqueleto no carga el barril de pantallas. Las seis tarjetas de Configuración › Leads.
export default function CargandoLeads() {
  return <EsqueletoTarjetas tarjetas={6} />
}
