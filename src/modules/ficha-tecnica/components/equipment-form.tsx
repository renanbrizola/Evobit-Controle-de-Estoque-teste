import { EquipmentType } from '../types/enums';
import { ActionButton, Field, SelectInput, TextInput } from '../components/management-primitives';

export interface EquipmentFormProps {
  form: {
    name: string;
    type: EquipmentType;
    hoursUsed: number;
    consumptionPerHour: number;
    utilityRate: number;
  };
  onChange: (updates: Partial<{
    name: string;
    type: EquipmentType;
    hoursUsed: number;
    consumptionPerHour: number;
    utilityRate: number;
  }>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isEditable: boolean;
  loading: boolean;
  gridClassName?: string;
  hoursLabel?: string;
  consumptionLabel?: string;
  utilityRateLabel?: string;
}

export function EquipmentForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isEditable,
  loading,
  gridClassName = 'grid gap-4 md:grid-cols-2',
  hoursLabel = 'Horas',
  consumptionLabel = 'Consumo/h',
  utilityRateLabel = 'Tarifa',
}: EquipmentFormProps) {
  return (
    <>
      <div className={gridClassName}>
        <Field label="Equipamento">
          <TextInput
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label="Tipo">
          <SelectInput
            value={form.type}
            onChange={(event) => onChange({ type: event.target.value as EquipmentType })}
            disabled={!isEditable || loading}
          >
            <option value={EquipmentType.ELECTRIC}>Elétrico</option>
            <option value={EquipmentType.GAS}>Gás</option>
          </SelectInput>
        </Field>
        <Field label={hoursLabel}>
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.hoursUsed}
            onChange={(event) => onChange({ hoursUsed: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label={consumptionLabel}>
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.consumptionPerHour}
            onChange={(event) => onChange({ consumptionPerHour: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
        <Field label={utilityRateLabel}>
          <TextInput
            type="number"
            min="0.01"
            step="0.01"
            value={form.utilityRate}
            onChange={(event) => onChange({ utilityRate: Number(event.target.value) })}
            disabled={!isEditable || loading}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={() => void onSubmit()}
          disabled={!isEditable || loading || !form.name}
        >
          {isEditing ? 'Atualizar equipamento' : 'Adicionar equipamento'}
        </ActionButton>
        <ActionButton
          tone="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {isEditing ? 'Cancelar' : 'Limpar'}
        </ActionButton>
      </div>
    </>
  );
}
