// Los esqueletos de la página de la unidad, sólo para `loading.tsx` y el `Suspense` de la foto: importar `unidad-pagina.ts` desde `loading.tsx` bajaría su chunk dos veces. Sólo `src/app` importa este archivo.
export {
  EsqueletoDeLaFoto,
  EsqueletoDeLaUnidad,
} from '../features/nucleo/components/esqueleto-de-la-unidad'
