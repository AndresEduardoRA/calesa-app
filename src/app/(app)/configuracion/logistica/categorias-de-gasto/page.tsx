import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo'

export const metadata = metadataDeCatalogo('categorias-de-gasto')

export default function PaginaDeCategoriasDeGasto() {
  return <PaginaDeCatalogoDeLogistica clave="categorias-de-gasto" />
}
