// El menú lateral plegado, para la cáscara que se sirve antes de leer la sesión. La preferencia de la persona (`menu.plegado`) vive en la base y
// el layout la lee en el servidor; esta cookie es sólo su copia en el navegador, para que `EsqueletoShell` (estático: no ve la sesión) dibuje la barra
// ya plegada y no salte de ancho cuando llega la de verdad. No lleva nada de la persona.

export const COOKIE_DEL_MENU_PLEGADO = 'menu-plegado'

export function cookieDelMenuPlegado(plegado: boolean): string {
  return `${COOKIE_DEL_MENU_PLEGADO}=${plegado ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`
}

// Va en la cáscara, justo después de su barra: la marca antes del primer pintado, igual que `<GuionLive>`.
export function codigoDelGuionDelMenu(): string {
  return `try{if(document.cookie.split('; ').indexOf('${COOKIE_DEL_MENU_PLEGADO}=1')>=0){var a=document.querySelector('[data-barra-lateral]');if(a)a.setAttribute('data-plegado','')}}catch(e){}`
}
