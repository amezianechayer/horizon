import * as React from 'react';
import styled from 'styled-components';

const KIND_COLOR = {
  bank:      '#1565c0',
  client:    '#2e7d32',
  supplier:  '#e65100',
  contracts: '#6a1b9a',
  world:     '#607d8b',
  other:     '#9e9e9e',
};

const KIND_LABELS = [
  ['bank',      'Bank'],
  ['client',    'Client'],
  ['supplier',  'Supplier'],
  ['contracts', 'Contracts'],
  ['world',     'World'],
  ['other',     'Other'],
];

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  padding: 8px 0 10px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
`;

const Swatch = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #444;
`;

const Dot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const Divider = styled.span`
  width: 1px;
  height: 16px;
  background: rgba(0,0,0,0.1);
  flex-shrink: 0;
`;

const ControlGroup = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
`;

const Select = styled.select`
  font-family: inherit;
  font-size: 12px;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  color: #333;
  background: #fff;

  &:focus { outline: none; border-color: #13e07e; }
`;

const RangeWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

const Range = styled.input`
  width: 90px;
  accent-color: #13e07e;
  cursor: pointer;
`;

const RangeVal = styled.span`
  font-family: 'Roboto Mono', monospace;
  font-size: 11px;
  color: #13e07e;
  min-width: 26px;
`;

/**
 * Presentational component: horizontal legend bar.
 *
 * Props:
 *   assets   — string[]
 *   value    — string (selected asset)
 *   onChange — (asset: string) => void
 *   limit    — number
 *   onLimitChange — (n: number) => void
 */
export default function GraphLegend({ assets, value, onChange, limit, onLimitChange }) {
  return (
    <Bar>
      {KIND_LABELS.map(([kind, label]) => (
        <Swatch key={kind}>
          <Dot color={KIND_COLOR[kind]} />
          {label}
        </Swatch>
      ))}

      <Divider />

      <ControlGroup>
        Asset
        <Select value={value} onChange={e => onChange && onChange(e.target.value)}>
          {(assets || []).map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
      </ControlGroup>

      <Divider />

      <ControlGroup>
        Top&nbsp;N
        <RangeWrap>
          <Range
            type="range"
            min={10}
            max={500}
            step={10}
            value={limit}
            onChange={e => onLimitChange && onLimitChange(Number(e.target.value))}
          />
          <RangeVal>{limit}</RangeVal>
        </RangeWrap>
      </ControlGroup>
    </Bar>
  );
}
