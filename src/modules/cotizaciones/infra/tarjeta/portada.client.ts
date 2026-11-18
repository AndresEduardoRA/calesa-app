// Pide la portada de una cotización recién guardada desde el navegador, sin esperarla ni mirar lo que vuelve: la ruta la arma y, si quien pide puede guardarla, la
// guarda (`docs/COTIZADOR.md` › «La portada de la cotización»). Un `fetch` y no una Server Action: el router corre las actions de a una y ésta tarda lo que armar la
// imagen. Sin red o con un fallo, nada: la portada se arma al pedirla.
import { rutaDeLaPortada } from '../../entities/ruta-de-la-hoja'

export function pedirLaPortada(id: string): void {
  void fetch(rutaDeLaPortada(id), { cache: 'no-store', redirect: 'manual' }).catch(() => undefined)
}
