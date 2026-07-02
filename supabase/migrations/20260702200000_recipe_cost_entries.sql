-- ==============================================================================
-- MIGRATION: custos de lote da receita na nuvem (packaging/labor/equipment)
-- O RxDB (recipeSchema v5) guarda embalagens/mao de obra/equipamentos como
-- arrays embutidos no doc da receita. Espelha o modelo com colunas jsonb em
-- public.recipes e atualiza a RPC de sync para persisti-las.
-- ==============================================================================

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS packaging_entries jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS labor_entries jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS equipment_entries jsonb DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.sync_recipe_with_ingredients(
    p_recipe jsonb,
    p_ingredients jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id uuid;
    v_recipe_id uuid;
    v_is_authorized boolean;
    v_deleted_at timestamp with time zone;
    v_ingredient jsonb;
    v_ing_id uuid;
BEGIN
    -- 1. Validar autenticação básica
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- 2. Garantir consistência Offline-First: Exigir ID local (RxDB)
    IF (p_recipe->>'id') IS NULL OR (p_recipe->>'id') = '' THEN
        RAISE EXCEPTION 'A receita deve conter um id gerado localmente (RxDB).';
    END IF;
    v_recipe_id := (p_recipe->>'id')::uuid;

    -- 3. Extrair e validar user_id da receita
    v_user_id := (p_recipe->>'user_id')::uuid;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'A receita deve conter um user_id.';
    END IF;

    -- 4. Validar permissão manual
    SELECT EXISTS (
        SELECT 1
        WHERE v_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.team_members
            WHERE owner_id = v_user_id AND member_id = auth.uid()
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Acesso negado. Usuário não é dono nem membro da equipe.';
    END IF;

    v_deleted_at := (p_recipe->>'deleted_at')::timestamp with time zone;

    -- 5. Upsert da Receita (Capa + custos de lote embutidos)
    INSERT INTO public.recipes (
        id,
        finished_product_id,
        name,
        yield_quantity,
        preparation_time_minutes,
        instructions,
        auto_production,
        is_active,
        packaging_entries,
        labor_entries,
        equipment_entries,
        user_id,
        created_at,
        updated_at,
        deleted_at
    ) VALUES (
        v_recipe_id,
        (p_recipe->>'finished_product_id')::uuid,
        (p_recipe->>'name')::text,
        COALESCE((p_recipe->>'yield_quantity')::numeric, 1),
        COALESCE((p_recipe->>'preparation_time_minutes')::numeric, 0),
        (p_recipe->>'instructions')::text,
        COALESCE((p_recipe->>'auto_production')::boolean, false),
        COALESCE((p_recipe->>'is_active')::boolean, true),
        COALESCE(p_recipe->'packaging_entries', '[]'::jsonb),
        COALESCE(p_recipe->'labor_entries', '[]'::jsonb),
        COALESCE(p_recipe->'equipment_entries', '[]'::jsonb),
        v_user_id,
        COALESCE((p_recipe->>'created_at')::timestamp with time zone, now()),
        COALESCE((p_recipe->>'updated_at')::timestamp with time zone, now()),
        v_deleted_at
    )
    ON CONFLICT (id) DO UPDATE SET
        finished_product_id = EXCLUDED.finished_product_id,
        name = EXCLUDED.name,
        yield_quantity = EXCLUDED.yield_quantity,
        preparation_time_minutes = EXCLUDED.preparation_time_minutes,
        instructions = EXCLUDED.instructions,
        auto_production = EXCLUDED.auto_production,
        is_active = EXCLUDED.is_active,
        packaging_entries = EXCLUDED.packaging_entries,
        labor_entries = EXCLUDED.labor_entries,
        equipment_entries = EXCLUDED.equipment_entries,
        user_id = EXCLUDED.user_id,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at;

    -- 6. Tratamento dos Ingredientes (Replace-all com Soft Delete)

    -- PASSO A: Soft-Delete de ingredientes antigos
    UPDATE public.recipe_ingredients
    SET deleted_at = COALESCE(v_deleted_at, now()), updated_at = now()
    WHERE recipe_id = v_recipe_id AND deleted_at IS NULL;

    -- PASSO B: Reinserção/Atualização de ingredientes ativos
    IF v_deleted_at IS NULL THEN
        IF p_ingredients IS NOT NULL AND jsonb_typeof(p_ingredients) = 'array' THEN
            FOR v_ingredient IN SELECT * FROM jsonb_array_elements(p_ingredients)
            LOOP
                IF (v_ingredient->>'input_product_id') IS NOT NULL THEN
                    v_ing_id := COALESCE((v_ingredient->>'id')::uuid, gen_random_uuid());

                    INSERT INTO public.recipe_ingredients (
                        id,
                        recipe_id,
                        input_product_id,
                        quantity,
                        unit,
                        loss_percentage,
                        discount_from_stock,
                        user_id,
                        created_at,
                        updated_at,
                        deleted_at
                    ) VALUES (
                        v_ing_id,
                        v_recipe_id,
                        (v_ingredient->>'input_product_id')::uuid,
                        COALESCE((v_ingredient->>'quantity')::numeric, 0),
                        (v_ingredient->>'unit')::text,
                        COALESCE((v_ingredient->>'loss_percentage')::numeric, 0),
                        COALESCE((v_ingredient->>'discount_from_stock')::boolean, true),
                        v_user_id,
                        COALESCE((v_ingredient->>'created_at')::timestamp with time zone, now()),
                        COALESCE((v_ingredient->>'updated_at')::timestamp with time zone, now()),
                        (v_ingredient->>'deleted_at')::timestamp with time zone
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        recipe_id = EXCLUDED.recipe_id,
                        input_product_id = EXCLUDED.input_product_id,
                        quantity = EXCLUDED.quantity,
                        unit = EXCLUDED.unit,
                        loss_percentage = EXCLUDED.loss_percentage,
                        discount_from_stock = EXCLUDED.discount_from_stock,
                        user_id = EXCLUDED.user_id,
                        updated_at = EXCLUDED.updated_at,
                        deleted_at = EXCLUDED.deleted_at;
                END IF;
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'recipe_id', v_recipe_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_recipe_with_ingredients(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_recipe_with_ingredients(jsonb, jsonb) TO authenticated;
