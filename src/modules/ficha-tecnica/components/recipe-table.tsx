import type { ReactNode } from 'react';

export interface RecipeTableProps {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}

export function RecipeTable({ columns, rows }: RecipeTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-left text-xs font-semibold uppercase tracking-[0.12em] text-white">
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-dashed border-slate-200 bg-white"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="px-4 py-3 text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                Nenhum registro cadastrado nesta ficha.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
