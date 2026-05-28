import { Field } from './management-primitives';

export interface RecipeProductFieldProps {
  value: string;
  onChange: (value: string, name: string) => void;
  products: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

export function RecipeProductField({
  value,
  onChange,
  products,
  disabled,
}: RecipeProductFieldProps) {
  return (
    <Field label="Produto Final (Obrigatório)">
      <select
        value={value || ''}
        onChange={(e) => {
          const selectedId = e.target.value;
          const selectedName = e.target.options[e.target.selectedIndex].text;
          onChange(selectedId, selectedName);
        }}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#4b86ff] focus:ring-2 focus:ring-[#4b86ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>Selecione um produto final...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
