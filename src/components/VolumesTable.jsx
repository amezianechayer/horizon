import * as React from 'react';
import styled from 'styled-components';

const Table = styled.div`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;

    &:last-child { border-bottom: none; }
    &:hover { background: var(--surface-2); }

    .asset {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-2);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 2px 7px;
      flex-shrink: 0;
      min-width: 70px;
    }

    .volumes {
      display: flex;
      gap: 16px;
      margin-left: auto;

      .vol {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;

        .vol-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-3);
        }
        .vol-value {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
        }
        &.in  .vol-value { color: var(--accent); }
        &.out .vol-value { color: var(--red); }
      }
    }
  }

  .empty {
    padding: 28px 16px;
    text-align: center;
    color: var(--text-3);
    font-size: 13px;
  }
`;

function Volumes({ volumes }) {
  const rows = Object.keys(volumes || {}).map(asset => ({
    asset,
    input:  (volumes[asset] || {}).input  || 0,
    output: (volumes[asset] || {}).output || 0,
  }));

  return (
    <Table>
      {rows.length === 0 && <div className="empty">No volume data</div>}
      {rows.map(({ asset, input, output }) => (
        <div className="row" key={asset}>
          <span className="asset">{asset}</span>
          <div className="volumes">
            <div className="vol in">
              <span className="vol-label">In</span>
              <span className="vol-value">+{input.toLocaleString('fr-FR')}</span>
            </div>
            <div className="vol out">
              <span className="vol-label">Out</span>
              <span className="vol-value">-{output.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>
      ))}
    </Table>
  );
}

export default Volumes;
