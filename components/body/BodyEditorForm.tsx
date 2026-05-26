'use client';

import { Button } from '@/components/ui/button';
import { WatchMeasurementGrid, WatchMeasurementInput } from '@/components/WatchSurface';

export interface BodyEditorDraft {
  weightKg: string;
  waistCm: string;
  shoulderCm: string;
  chestCm: string;
  hipCm: string;
  neckCm: string;
  quadCm: string;
  calfCm: string;
  forearmCm: string;
  wristCm: string;
  ankleCm: string;
  bicepsCm: string;
  targetWeightKg: string;
  heightCm: string;
}

export function BodyEditorForm({
  draft,
  onDraftChange,
  onCancel,
  onSave,
}: {
  draft: BodyEditorDraft;
  onDraftChange: (draft: BodyEditorDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const updateDraft = (key: keyof BodyEditorDraft, value: string) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <WatchMeasurementGrid>
        <BodyEditorMeasurementInput label="Weight" unit="kg" value={draft.weightKg} onChange={(weightKg) => updateDraft('weightKg', weightKg)} />
        <BodyEditorMeasurementInput label="Waist" unit="cm" value={draft.waistCm} onChange={(waistCm) => updateDraft('waistCm', waistCm)} />
        <BodyEditorMeasurementInput label="Shoulder" unit="cm" value={draft.shoulderCm} onChange={(shoulderCm) => updateDraft('shoulderCm', shoulderCm)} />
        <BodyEditorMeasurementInput label="Chest" unit="cm" value={draft.chestCm} onChange={(chestCm) => updateDraft('chestCm', chestCm)} />
        <BodyEditorMeasurementInput label="Hip" unit="cm" value={draft.hipCm} onChange={(hipCm) => updateDraft('hipCm', hipCm)} />
        <BodyEditorMeasurementInput label="Neck" unit="cm" value={draft.neckCm} onChange={(neckCm) => updateDraft('neckCm', neckCm)} />
        <BodyEditorMeasurementInput label="Quad" unit="cm" value={draft.quadCm} onChange={(quadCm) => updateDraft('quadCm', quadCm)} />
        <BodyEditorMeasurementInput label="Calf" unit="cm" value={draft.calfCm} onChange={(calfCm) => updateDraft('calfCm', calfCm)} />
        <BodyEditorMeasurementInput label="Forearm" unit="cm" value={draft.forearmCm} onChange={(forearmCm) => updateDraft('forearmCm', forearmCm)} />
        <BodyEditorMeasurementInput label="Wrist" unit="cm" value={draft.wristCm} onChange={(wristCm) => updateDraft('wristCm', wristCm)} />
        <BodyEditorMeasurementInput label="Ankle" unit="cm" value={draft.ankleCm} onChange={(ankleCm) => updateDraft('ankleCm', ankleCm)} />
        <BodyEditorMeasurementInput label="Biceps" unit="cm" value={draft.bicepsCm} onChange={(bicepsCm) => updateDraft('bicepsCm', bicepsCm)} />
        <BodyEditorMeasurementInput label="Ideal weight" unit="kg" value={draft.targetWeightKg} onChange={(targetWeightKg) => updateDraft('targetWeightKg', targetWeightKg)} />
        <BodyEditorMeasurementInput label="Height" unit="cm" value={draft.heightCm} onChange={(heightCm) => updateDraft('heightCm', heightCm)} />
      </WatchMeasurementGrid>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-10 rounded-lg border border-white/10 bg-white/5 text-fluid-label font-mono font-black uppercase text-white/55 hover:bg-white/10 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSave}
          className="h-10 rounded-lg bg-white text-fluid-label font-mono font-black uppercase text-black hover:bg-white/90"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function BodyEditorMeasurementInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <WatchMeasurementInput
      label={label}
      unit={unit}
      ariaUnit={unit}
      value={value}
      onChange={onChange}
    />
  );
}
