import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ItemType } from '../types/enums';
import {
  type InventoryCatalogItem,
  searchInventoryItems,
} from '../lib/inventory-management-api';

export interface IngredientComboboxProps {
  value: string;
  onSelect: (value: string, uomId?: string) => void;
  subRecipes: Array<{ id: string; name: string }>;
  currentRecipeId: string;
  disabled?: boolean;
  selectedLabel: string;
}

export function IngredientCombobox({
  value,
  onSelect,
  subRecipes,
  currentRecipeId,
  disabled,
  selectedLabel,
}: IngredientComboboxProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [cachedSelectedLabel, setCachedSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    setSearching(true);
    try {
      const results = await searchInventoryItems(term, 20);
      setItems(results);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, doSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setCachedSelectedLabel('');
      return;
    }

    if (selectedLabel) {
      setCachedSelectedLabel(selectedLabel);
    }
  }, [selectedLabel, value]);

  const mirroredSubRecipeIds = useMemo(
    () =>
      new Set(
        items
          .map((item) =>
            item.type === ItemType.COMPOSITE ? item.recipeId || null : null,
          )
          .filter((recipeId): recipeId is string => Boolean(recipeId)),
      ),
    [items],
  );

  const filteredSubRecipes = subRecipes
    .filter((r) => r.id !== currentRecipeId)
    .filter((r) => !mirroredSubRecipeIds.has(r.id))
    .filter(
      (r) => !search || r.name.toLowerCase().includes(search.toLowerCase()),
    );

  const inputDisplayValue = open
    ? search
    : value
      ? selectedLabel || cachedSelectedLabel
      : '';

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputDisplayValue}
        placeholder="Buscar insumo ou sub-receita…"
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#4b86ff] focus:ring-2 focus:ring-[#4b86ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredSubRecipes.length ? (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Sub-receitas
              </p>
              {filteredSubRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(`subrecipe:${recipe.id}`);
                    setCachedSelectedLabel(recipe.name);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {recipe.name}
                </button>
              ))}
            </>
          ) : null}
          {searching ? (
            <p className="px-3 py-2 text-sm text-slate-400">Buscando…</p>
          ) : items.length ? (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Insumos
              </p>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const mirroredRecipeId =
                      item.type === ItemType.COMPOSITE
                        ? item.recipeId || ''
                        : '';
                    onSelect(
                      mirroredRecipeId
                        ? `subrecipe:${mirroredRecipeId}`
                        : `inventory:${item.id}`,
                      item.uom.id,
                    );
                    setCachedSelectedLabel(item.name);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {item.name} · {item.uom.abbreviation}
                </button>
              ))}
            </>
          ) : !filteredSubRecipes.length ? (
            <p className="px-3 py-2 text-sm text-slate-400">
              Nenhum resultado encontrado.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
