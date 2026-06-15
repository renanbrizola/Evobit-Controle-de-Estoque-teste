import { Field, TextInput } from '../components/management-primitives';

export interface RecipeNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function RecipeNameField({
  value,
  onChange,
  disabled,
  label = 'Nome',
}: RecipeNameFieldProps) {
  return (
    <Field label={label}>
      <TextInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </Field>
  );
}
