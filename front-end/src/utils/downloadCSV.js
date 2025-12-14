const downloadPredictionAsCSV = (rows) => {
  if (!rows || !rows.length) return;

  const DISPLAY_KEYS = ["Tanggal", "PM10", "SO2", "CO", "O3", "NO2"];
  const keys = DISPLAY_KEYS.filter((k) => k in rows[0]);
  const header = keys.join(",") + "\n";

  const body = rows
    .map((row) =>
      keys
        .map((k) => {
          if (k === "Tanggal") {
            return new Date(row[k]).toISOString().split("T")[0];
          }

          const value = row[k];
          return typeof value === "number" ? value.toFixed(4) : value; // FLOATING POINT 4
        })
        .join(",")
    )
    .join("\n");

  const csvContent = header + body;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `prediction_results_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default downloadPredictionAsCSV;
