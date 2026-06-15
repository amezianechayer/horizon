import * as React from 'react';
import styled from 'styled-components';

const Card = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 200px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 10px 14px;
  pointer-events: none;
  z-index: 10;
  font-size: 12px;
  color: #333;
`;

const Title = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #888;
  margin-bottom: 8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 3px 0;
`;

const Label = styled.span`
  color: #888;
`;

const Value = styled.span`
  font-family: 'Roboto Mono', monospace;
  font-weight: 500;
  color: #222;
`;

const RouteRow = styled.div`
  font-family: 'Roboto Mono', monospace;
  font-size: 11px;
  color: #444;
  word-break: break-all;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
`;

/**
 * EdgeDetailPanel: absolutely-positioned card shown on edge hover.
 *
 * Props:
 *   edge — { source: {id} | string, target: {id} | string, asset, amount, count } | null
 */
export default function EdgeDetailPanel({ edge }) {
  if (!edge) return null;

  const srcId  = edge.source && typeof edge.source === 'object' ? edge.source.id : edge.source;
  const tgtId  = edge.target && typeof edge.target === 'object' ? edge.target.id : edge.target;

  const fmt = n => {
    if (n == null) return '—';
    return Number(n).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  };

  return (
    <Card>
      <Title>Edge detail</Title>
      <RouteRow>{srcId} → {tgtId}</RouteRow>
      <Row><Label>Asset</Label><Value>{edge.asset || '—'}</Value></Row>
      <Row><Label>Amount</Label><Value>{fmt(edge.amount)}</Value></Row>
      <Row><Label>Count</Label><Value>{edge.count != null ? edge.count : '—'}</Value></Row>
    </Card>
  );
}
