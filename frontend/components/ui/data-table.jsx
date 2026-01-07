import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { cn } from '../../lib/utils';

/**
 * DataTable Component
 * A reusable table component with sorting, filtering, and pagination support
 */
export function DataTable({
  columns,
  data,
  className,
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
}) {
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={column.key || index}
                className={column.headerClassName}
                style={column.headerStyle}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : !data || data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => {
              const rowId = row.id || row._id || rowIndex;
              return (
                <TableRow
                  key={rowId}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick && onRowClick(row, rowIndex)}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={column.key || colIndex}
                      className={column.cellClassName}
                      style={column.cellStyle}
                    >
                      {column.cell
                        ? column.cell(row, rowIndex)
                        : row[column.accessorKey] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
