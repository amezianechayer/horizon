import * as React from 'react';
import styled from 'styled-components';

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(63, 185, 80, 0.12);
  color: var(--accent);
  border: 1px solid rgba(63, 185, 80, 0.25);

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }
`;

function Status({ children }) {
  return <Badge>{children}</Badge>;
}

export default Status;
