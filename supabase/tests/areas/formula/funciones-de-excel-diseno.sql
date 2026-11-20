-- Las auxiliares de un texto con SI y una condición en el diseño: `_diseno_auxiliares()` da las mismas que `auxiliaresDe()` de TS para el
-- total del ejemplo de docs/COTIZADOR.md › «Fórmulas como texto», con una comparación, MAX y BUSCARV por tramo. La raíz es un `elegir` que
-- nombra la comparación sólo en su `prueba`: si la base no la contara como referencia, no vería la cadena y publicar pediría una celda
-- para cada auxiliar (`nodo_sin_seccion`). Los nodos son los que da `compilarExpresion()` para ese texto.

-- @test fórmula: _diseno_auxiliares ve la cadena de un SI con condición, MAX y BUSCARV como auxiliaresDe
do $$
declare
  v_def jsonb := $j${"nodos":[{"id":"pub","tipo":"input","etiqueta":"Pública"},{"id":"tc","tipo":"tipo_cambio","etiqueta":"TC","clave":"oficial","formato":"raw"},{"id":"total__1","tipo":"constante","etiqueta":"1000","formato":"raw"},{"id":"total__2","tipo":"calculo","etiqueta":"pub>1000","formato":"raw","op":"comparar","de":["pub","total__1"],"cmp":">"},{"id":"total__3","tipo":"constante","etiqueta":"0.1","formato":"raw"},{"id":"total__4","tipo":"calculo","etiqueta":"pub*0.1","op":"multiplicar","de":["pub","total__3"]},{"id":"total__5","tipo":"constante","etiqueta":"150","formato":"raw"},{"id":"total__6","tipo":"calculo","etiqueta":"MAX(pub*0.1; 150)","op":"max","de":["total__4","total__5"]},{"id":"total__7","tipo":"tramo","etiqueta":"BUSCARV(pub; \"fletes\"; \"monto\"; VERDADERO)","tabla":"fletes","sobre":"pub","columna":"monto"},{"id":"total","tipo":"calculo","etiqueta":"Total","salida":"total","op":"elegir","de":["total__6","total__7"],"prueba":"total__2","texto":"=SI(pub>1000; MAX(pub*0.1; 150); BUSCARV(pub; \"fletes\"; \"monto\"; VERDADERO))"}]}$j$::jsonb;
  v jsonb;
begin
  v := public._diseno_auxiliares(v_def);
  if v is distinct from '{"total__1": true, "total__2": true, "total__3": true, "total__4": true, "total__5": true, "total__6": true, "total__7": true}'::jsonb then
    raise exception 'las auxiliares: %', v;
  end if;
  -- Sin la prueba, la comparación queda suelta: ya no es la cadena de un texto y ninguna es auxiliar.
  v := public._diseno_auxiliares(jsonb_set(v_def, '{nodos,9,prueba}', '"pub"'));
  if v <> '{}'::jsonb then raise exception 'con la prueba en otro nodo: %', v; end if;
end $$;
