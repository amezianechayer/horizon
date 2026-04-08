import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Addr = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  color: var(--blue);
  background: var(--blue-dim);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  transition: border-color 0.15s, background 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: var(--blue);
    background: rgba(88, 166, 255, 0.18);
  }

  &.world {
    color: #f85149;
    background: rgba(248, 81, 73, 0.1);
    &:hover { border-color: #f85149; background: rgba(248,81,73,0.18); }
  }

  &.sub {
    color: #79c0ff;
    background: rgba(121, 192, 255, 0.08);
    &:hover { border-color: #79c0ff; background: rgba(121,192,255,0.15); }
  }
`;

function Address({ data }) {
  const isWorld = data === '@world' || data.startsWith('@world');
  const isSub   = !isWorld && data.includes(':');
  const cls     = isWorld ? 'world' : isSub ? 'sub' : '';

  return (
    <Addr to={`/accounts/${data}`} className={cls}>
      {data}
    </Addr>
  );
}

export default Address;
