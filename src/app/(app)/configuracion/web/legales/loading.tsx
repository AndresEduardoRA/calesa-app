import { EsqueletoTarjetas } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas.
export default function CargandoWebLegales() {
  return <EsqueletoTarjetas tarjetas={2} />
}
