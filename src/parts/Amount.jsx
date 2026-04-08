import * as React from 'react';
import styled from 'styled-components';

const Span = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;

  &.green { color: var(--accent); }
  &.red   { color: var(--red); }
`;

function Amount({ data, children, color }) {
  return <Span className={color}>{data || children}</Span>;
}

export default Amount;
