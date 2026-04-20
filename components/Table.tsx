export default function Table({ columns, data, keyField }: { columns: { header: string; accessor: string; render?: (val: any, row: any) => React.ReactNode }[]; data: any[]; keyField: string }) {
  return (
    <div className="overflow-x-auto bg-slate-800 rounded-md border border-slate-700">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 font-medium">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">No records found</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[keyField]} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-4 py-3">
                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}