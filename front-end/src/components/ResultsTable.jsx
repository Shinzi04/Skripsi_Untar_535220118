const ResultsTable = ({ rows }) => {
  if (!rows?.length) return null;
  const DISPLAY_KEYS = ["Tanggal", "PM10", "SO2", "CO", "O3", "NO2"];
  const keys = DISPLAY_KEYS.filter((k) => k in rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {keys.map((k) => (
              <th
                key={k}
                className="px-3 py-2 text-left font-display text-gray-700"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {keys.map((k) => (
                <td key={k} className="whitespace-nowrap px-3 py-2">
                  {k === "Tanggal"
                    ? new Date(r[k]).toLocaleDateString()
                    : typeof r[k] === "number"
                    ? r[k].toFixed(3)
                    : String(r[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResultsTable