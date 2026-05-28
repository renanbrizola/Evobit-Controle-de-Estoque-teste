import { Field, SelectInput, TextInput } from '../components/management-primitives';

export interface RecipeYieldFieldsProps {
  yieldQuantity: number | string;
  yieldUomId: string;
  servingSize: number | string;
  onChange: (updates: Partial<{
    yieldQuantity: number;
    yieldUomId: string;
    servingSize: number;
  }>) => void;
  uoms: { id: string; abbreviation: string; name: string }[];
  disabled: boolean;
}

export function RecipeYieldFields({
  yieldQuantity,
  yieldUomId,
  servingSize,
  onChange,
  uoms,
  disabled,
}: RecipeYieldFieldsProps) {
  return (
    <>
      <Field label="Rendimento">
        <TextInput
          type="number"
          min="0.01"
          step="0.01"
          value={yieldQuantity}
          onChange={(event) => onChange({ yieldQuantity: Number(event.target.value) })}
          disabled={disabled}
        />
      </Field>
      <Field label="Unidade">
        <SelectInput
          value={yieldUomId}
          onChange={(event) => onChange({ yieldUomId: event.target.value })}
          disabled={disabled}
        >
          <option value="">Selecione</option>
          {uoms.map((uom) => (
            <option key={uom.id} value={uom.id}>
              {uom.abbreviation} · {uom.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Porção / unidade">
        <TextInput
          type="number"
          min="0.01"
          step="0.01"
          value={servingSize}
          onChange={(event) => onChange({ servingSize: Number(event.target.value) })}
          disabled={disabled}
        />
      </Field>
    </>
  );
}
