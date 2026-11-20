-- El embudo que cada persona dejó a la vista en el bloque «Oportunidades» de la ficha de un lead (`leads.embudo_de_la_ficha`): el id de uno de
-- sus embudos, como texto. La base sólo admite un id con su forma; si el embudo ya no existe o no es de la persona, la ficha lo ignora (cae en el
-- por defecto). La fila es de quien la escribe (la policy de siempre).
ALTER TABLE "public"."preferencias_usuario"
    ADD CONSTRAINT "preferencias_embudo_de_la_ficha_valida" CHECK (
        ("clave" <> 'leads.embudo_de_la_ficha'::"text")
        OR (
            "jsonb_typeof"("valor") = 'string'::"text"
            AND ("valor" #>> '{}'::"text"[]) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::"text"
        )
    );
