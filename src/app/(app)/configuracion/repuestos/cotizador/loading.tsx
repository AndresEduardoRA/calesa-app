import { EsqueletoFormulario } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/repuestos`: el esqueleto no carga el barril de pantallas.
export default function CargandoElCotizadorDeRepuestos() {
  return <EsqueletoFormulario bloques={3} campos={3} />
}
