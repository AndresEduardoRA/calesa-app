import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo-de-logistica'

export const metadata = metadataDeCatalogo('categorias-de-gasto')

export default function PaginaDeCategoriasDeGasto() {
  return <PaginaDeCatalogoDeLogistica clave="categorias-de-gasto" />
}
