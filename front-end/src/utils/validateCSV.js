import Papa from "papaparse";

export const EXPECTED_HEADERS = [
  "Tanggal",
  "PM10",
  "SO2",
  "CO",
  "O3",
  "NO2",
  "Temperatur",
  "Kelembapan",
  "Curah Hujan",
  "Penyinaran Matahari",
  "Kecepatan Angin",
];

export function validateCsvHeaders(file, { enforceOrder = true } = {}) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (response) => {
        const actual = (response.meta.fields || []).map((h) => h.trim());
        const expected = EXPECTED_HEADERS;

        const missing = expected.filter((h) => !actual.includes(h));
        const extra = actual.filter((h) => !expected.includes(h));

        if (missing.length || extra.length) {
          return reject(
            new Error(
              [
                "Kolom CSV tidak sesuai format",
                missing.length ? `Missing: ${missing.join(", ")}` : "",
                extra.length ? `Unexpected: ${extra.join(", ")}` : "",
              ]
                .filter(Boolean)
                .join(" ")
            )
          );
        }

        if (enforceOrder) {
          const orderMatches =
            actual.length === expected.length &&
            actual.every((h, i) => h === expected[i]);
          if (!orderMatches) {
            return reject(
              new Error(`Urutan kolom harus: ${expected.join(" | ")}`)
            );
          }
        }

        resolve();
      },
      error: (err) => reject(err),
    });
  });
}
