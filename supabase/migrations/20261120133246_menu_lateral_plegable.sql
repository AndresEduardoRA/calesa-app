-- «menu.plegado»: si la persona ve el menú lateral plegado a sólo íconos (booleano). Como las demás preferencias, la base sólo admite su valor;
-- quién la escribe lo sigue diciendo la policy de `preferencias_usuario` (cada persona, la suya).
alter table public.preferencias_usuario
  add constraint preferencias_menu_plegado_valida
  check (clave <> 'menu.plegado' or jsonb_typeof(valor) = 'boolean');
