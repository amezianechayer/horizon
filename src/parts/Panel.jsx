import * as React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: ${props => props.nopad ? 0 : '20px'};
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  h1, h2, h3 { margin-top: 0; }
`;

function Panel(props) {
  return <Wrapper className="panel" {...props} />;
}

export default Panel;
