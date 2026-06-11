import * as React from 'react';
import styled from 'styled-components';
import {Link} from 'react-router-dom';
import ContractsTable from '../components/ContractsTable.jsx';
import {SessionContext, canOperate} from '../lib/session.jsx';

const Wrapper = styled.div`
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    h1 { margin: 0; }
  }
`;

function Contracts() {
  return (
    <Wrapper>
      <div className="top-container mt20 mb40">
        <div className="header">
          <h1>Contracts</h1>
          <SessionContext.Consumer>
            {identity => canOperate(identity) && (
              <Link className="button action" to="/contracts/new">New contract</Link>
            )}
          </SessionContext.Consumer>
        </div>
        <ContractsTable/>
      </div>
    </Wrapper>
  );
}

export default Contracts;
