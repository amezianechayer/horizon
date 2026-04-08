import * as React from 'react';
import styled from 'styled-components';
import { useTable } from 'react-table';

const TableWrapper = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  thead tr {
    border-bottom: 1px solid var(--border);

    th {
      padding: 10px 16px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-3);

      &.left { text-align: left; }
    }
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;

    &:last-child { border-bottom: none; }

    &:hover { background: var(--surface-2); }

    td {
      padding: 12px 16px;
      text-align: center;
      color: var(--text-1);

      &.left { text-align: left; }
    }
  }

  .empty-row td {
    padding: 48px 16px;
    text-align: center;
    color: var(--text-3);
    font-size: 13px;
    &:hover { background: none; }
  }
`;

function Table({ columns, data, empty, getRowProps = () => ({}), getCellProps = () => ({}) }) {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns, data });

  return (
    <TableWrapper {...getTableProps()}>
      <thead>
        {headerGroups.map(hg => (
          <tr {...hg.getHeaderGroupProps()}>
            {hg.headers.map(col => (
              <th {...col.getHeaderProps()}>{col.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map(row => {
          prepareRow(row);
          return (
            <tr {...row.getRowProps()} {...getRowProps(row)}>
              {row.cells.map(cell => (
                <td {...cell.getCellProps([{ className: cell.column.className }, getCellProps(cell)])}>
                  {cell.render('Cell')}
                </td>
              ))}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr className="empty-row">
            <td colSpan={headerGroups[0].headers.length}>
              {empty || <span>No data</span>}
            </td>
          </tr>
        )}
      </tbody>
    </TableWrapper>
  );
}

export default Table;
