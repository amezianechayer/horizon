import * as React from 'react';
import styled from 'styled-components';

const COLORS = {
  // contract states
  PROMISE:   {bg: '#eceff1', fg: '#455a64'},
  ACQUIRED:  {bg: '#e3f2fd', fg: '#1565c0'},
  SOLD:      {bg: '#fff3e0', fg: '#e65100'},
  SETTLED:   {bg: '#e8f5e9', fg: '#1b5e20'},
  CANCELLED: {bg: '#ffebee', fg: '#b71c1c'},
  // installment statuses
  pending:       {bg: '#eceff1', fg: '#455a64'},
  paid:          {bg: '#e8f5e9', fg: '#1b5e20'},
  overdue:       {bg: '#ffebee', fg: '#b71c1c'},
  settled_early: {bg: '#e0f2f1', fg: '#00695c'},
  // audit decisions
  allowed: {bg: '#e8f5e9', fg: '#1b5e20'},
  denied:  {bg: '#ffebee', fg: '#b71c1c'},
};

const Pill = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
`;

function StateBadge({state}) {
  const c = COLORS[state] || {bg: '#eee', fg: '#333'};
  return (
    <Pill style={{background: c.bg, color: c.fg}}>{state}</Pill>
  );
}

export default StateBadge;
