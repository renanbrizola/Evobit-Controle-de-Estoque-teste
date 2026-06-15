import { Field, SelectInput } from '../components/management-primitives';

export interface RecipeCategoryFieldProps {
  categoryId: string;
  onChange: (categoryId: string) => void;
  categories: { id: string; name: string }[];
  disabled: boolean;
}

export function RecipeCategoryField({
  categoryId,
  onChange,
  categories,
  disabled,
}: RecipeCategoryFieldProps) {
  return (
    <Field label="Categoria">
      <SelectInput
        value={categoryId}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Sem categoria</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}
