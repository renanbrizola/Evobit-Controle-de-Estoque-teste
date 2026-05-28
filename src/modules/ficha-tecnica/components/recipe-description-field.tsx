import { Field, TextInput } from '../components/management-primitives';

export interface RecipeDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  useTextarea?: boolean;
}

export function RecipeDescriptionField({
  value,
  onChange,
  disabled,
  useTextarea = false,
}: RecipeDescriptionFieldProps) {
  return (
    <Field label="Descrição">
      {useTextarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#4b86ff] focus:ring-2 focus:ring-[#4b86ff]/20"
        />
      ) : (
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
    </Field>
  );
}
