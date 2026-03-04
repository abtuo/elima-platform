import { clsx } from "clsx";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export function EditableTable<T>({
  columns,
  rows,
  rowKey,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}) {
  return (
    <div className={clsx("overflow-hidden rounded-2xl border border-slate-200 bg-white", className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={clsx("px-4 py-3", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-t border-slate-200">
              {columns.map((c) => (
                <td key={c.key} className={clsx("px-4 py-3 align-top", c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
