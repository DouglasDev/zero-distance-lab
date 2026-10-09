import { styled } from '@linaria/react';

export const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

export const Button = styled.button`
  color: #dfe5da;
  background: #202c25;
  border: 1px solid #405247;
  border-radius: 6px;
  padding: 10px 14px;
  &:hover:not(:disabled) {
    background: #2c3c31;
  }
  &[data-primary='true'] {
    background: #d8dfbe;
    color: #17231c;
    border-color: #d8dfbe;
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

export const Field = styled.label`
  display: block;
  margin: 20px 0;
  span {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    gap: 8px;
  }
  input {
    width: 100%;
    margin: 12px 0 0;
    accent-color: #c4d19f;
  }
`;

export const Note = styled.p`
  font-size: 12px;
  line-height: 1.6;
  color: #95a693;
  margin: 22px 0 0;
`;

interface RangeControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function RangeControl({ label, value, onChange, min = 8, max = 38 }: RangeControlProps) {
  return (
    <Field>
      <span>
        {label} <output>{Math.round(value * 100)}%</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step="1"
        value={value * 100}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </Field>
  );
}
