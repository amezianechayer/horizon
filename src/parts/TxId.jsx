import * as React from 'react';
import styled from 'styled-components';

const Span = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 7px;
`;

function TxId({ children: id }) {
  return <Span>#{`${id}`.padStart(5, '0')}</Span>;
}

export default TxId;
