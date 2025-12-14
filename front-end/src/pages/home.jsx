import React, { useMemo, useState } from "react";
import {
  modelPredict,
  savePrediction,
  getSavedPrediction,
} from "../models/MLModel";

// --- Helpers ---------------------------------------------------------------
const toISODate = (d) => new Date(d).toISOString().slice(0, 10);
const range = (n) => Array.from({ length: n }, (_, i) => i);

const MET_KEYS = [
  "tanggal",
  "temperatur",
  "kelembapan",
  "curah_hujan",
  "penyinaran_matahari",
  "kecepatan_angin",
];

import { parseCSV, pick } from "../utils/validatePredictionCSV";
import { enrichWithAQI } from "../utils/aqi_calculator";
import AQISummarySection from "../components/AQICard";
import ResultsTable from "../components/ResultsTable";
import PreviewJSONCard from "../components/PreviewJSONCard";
import downloadPredictionAsCSV from "../utils/downloadCSV";

const Block = ({ title, children, actions }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between">
      <h2 className="text-lg font-display font-bold">{title}</h2>
      {actions}
    </div>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={
      "w-32 rounded-xl border border-gray-300 p-2 text-center outline-none transition focus:border-gray-900" +
      (props.className || "")
    }
  />
);

const NumberInput = (props) => <Input type="number" step="any" {...props} />;

const Button = ({ children, className = "", ...rest }) => (
  <button
    className={
      "rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px " +
      "bg-gray-900 text-white hover:bg-black " +
      className
    }
    {...rest}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = "", ...rest }) => (
  <button
    className={
      "rounded-2xl border border-gray-300 px-2 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 bg-yellow-500" +
      className
    }
    {...rest}
  >
    {children}
  </button>
);

export default function HomePage() {
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState(1); // 1-7 HARI
  const [metInputs, setMetInputs] = useState([]);
  const [historyInputs, setHistoryInputs] = useState([]);
  const [rawPrediction, setRawPrediction] = useState(null);

  const [payload, setPayload] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useMemo(() => {
    if (!startDate || !days) return;
    const rows = range(Number(days)).map((i) => ({
      tanggal: toISODate(
        new Date(new Date(startDate).getTime() + i * 86400000)
      ),
      temperatur: "",
      kelembapan: "",
      curah_hujan: "",
      penyinaran_matahari: "",
      kecepatan_angin: "",
    }));
    setMetInputs(rows);
  }, [startDate, days]);

  function updateRow(kind, idx, key, value) {
    const setter = kind === "met" ? setMetInputs : setHistoryInputs;
    const arr = kind === "met" ? [...metInputs] : [...historyInputs];
    arr[idx] = { ...arr[idx], [key]: value };
    setter(arr);
  }

  function addHistoryRow() {
    setHistoryInputs((prev) => [
      ...prev,
      {
        tanggal: prev.length
          ? toISODate(
              new Date(
                new Date(prev[prev.length - 1].tanggal).getTime() + 86400000
              )
            )
          : toISODate(new Date(new Date().getTime() - 86400000)),
        temperatur: "",
        kelembapan: "",
        curah_hujan: "",
        penyinaran_matahari: "",
        kecepatan_angin: "",
        PM10: "",
        SO2: "",
        CO: "",
        O3: "",
        NO2: "",
      },
    ]);
  }

  function removeHistoryRow(i) {
    setHistoryInputs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function rowsToArrays(rows, withPollutants = false) {
    const cols = {
      tanggal: rows.map((r) => r.tanggal),
      temperatur: rows.map((r) => Number(r.temperatur)),
      kelembapan: rows.map((r) => Number(r.kelembapan)),
      curah_hujan: rows.map((r) => Number(r.curah_hujan)),
      penyinaran_matahari: rows.map((r) => Number(r.penyinaran_matahari)),
      kecepatan_angin: rows.map((r) => Number(r.kecepatan_angin)),
    };
    if (withPollutants) {
      cols["PM10"] = rows.map((r) => Number(r.PM10));
      cols["SO2"] = rows.map((r) => Number(r.SO2));
      cols["CO"] = rows.map((r) => Number(r.CO));
      cols["O3"] = rows.map((r) => Number(r.O3));
      cols["NO2"] = rows.map((r) => Number(r.NO2));
    }
    return cols;
  }

  function buildPayload() {
    const body = rowsToArrays(metInputs, false);
    if (historyInputs.length) {
      body.history = rowsToArrays(historyInputs, true);
    }
    return body;
  }

  function validateRows(rows, withPollutants = false) {
    if (!rows.length) return "Belum ada data";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      for (const k of MET_KEYS) {
        if (r[k] === "" || r[k] === null || r[k] === undefined) {
          return `Baris ${i + 1}: missing ${k}`;
        }
        if (k !== "tanggal" && isNaN(Number(r[k]))) {
          return `Baris ${i + 1}: ${k} harus angka`;
        }
      }
      if (withPollutants) {
        for (const k of ["PM10", "SO2", "CO", "O3", "NO2"]) {
          if (r[k] === "" || isNaN(Number(r[k])))
            return `History row ${i + 1}: ${k} must be a number`;
        }
      }
    }
    if (rows.length > 7) return "Maximum 7 days of meteorology data allowed.";
    return "";
  }

  async function onSubmit() {
    try {
      setError("");
      setSaveMessage("");
      const e1 = validateRows(metInputs, false);
      if (e1) throw new Error(e1);
      if (historyInputs.length) {
        const e2 = validateRows(historyInputs, true);
        if (e2) throw new Error(e2);
      }
      const payload = buildPayload();
      // setPayload(payload);
      setLoading(true);
      const response = await modelPredict(payload);
      setRawPrediction(response);
      const enriched = (response?.predictions || []).map(enrichWithAQI);
      setResults(enriched);
    } catch (err) {
      setResults(null);
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSavePrediction() {
    if (!rawPrediction) return;
    try {
      setSaveMessage("");
      setSaveLoading(true);
      // send the exact modelPredict response
      await savePrediction(rawPrediction);
      setSaveMessage("Prediksi berhasil disimpan.");
    } catch (e) {
      setSaveMessage(e?.message || "Gagal menyimpan prediksi");
    } finally {
      setSaveLoading(false);
    }
  }

  async function onLoadSaved() {
    try {
      setLoading(true);
      setError("");
      setSaveMessage("");
      const saved = await getSavedPrediction();
      // saved can be any JSON; prefer to read saved.predictions if present
      const preds = Array.isArray(saved?.predictions) ? saved.predictions : [];
      const enriched = preds.map(enrichWithAQI);
      setResults(enriched);
      // keep a raw-shaped object for potential re-save
      setRawPrediction({ predictions: preds });
    } catch (e) {
      setError(e?.message || "Gagal mengambil hasil tersimpan");
    } finally {
      setLoading(false);
    }
  }

  const handleCSV = async (file, target) => {
    try {
      const text = await file.text();
      const { header, data } = parseCSV(text);
      if (!header.length) throw new Error("Empty CSV");

      const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
      const requireCols =
        target === "met"
          ? MET_KEYS
          : [...MET_KEYS, "PM10", "SO2", "CO", "O3", "NO2"];
      const missing = requireCols.filter((c) => !(c in idx));
      if (missing.length)
        throw new Error("Missing columns: " + missing.join(", "));

      const rows = data.map((r) => {
        const base = pick(
          {
            tanggal: r[idx.tanggal],
            temperatur: r[idx.temperatur],
            kelembapan: r[idx.kelembapan],
            curah_hujan: r[idx.curah_hujan],
            penyinaran_matahari: r[idx.penyinaran_matahari],
            kecepatan_angin: r[idx.kecepatan_angin],
          },
          MET_KEYS
        );
        if (target === "history") {
          return {
            ...base,
            PM10: r[idx.PM10],
            SO2: r[idx.SO2],
            CO: r[idx.CO],
            O3: r[idx.O3],
            NO2: r[idx.NO2],
          };
        }
        return base;
      });

      if (target === "met") setMetInputs(rows.slice(0, 7));
      else setHistoryInputs(rows);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to parse CSV");
    }
  };

  function downloadTemplate(kind) {
    const baseCols = MET_KEYS.join(",");
    const historyCols = baseCols + ",PM10,SO2,CO,O3,NO2";
    const header = kind === "history" ? historyCols : baseCols;
    const sample = [
      header,
      kind === "history"
        ? "2025-10-12,27.0,85,2.0,5.5,2.1,18.0,48.0,5.00,37.0,64.0"
        : "2025-10-20,27.1,85,10.0,5.0,2.3",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${kind}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prediksi</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Upload data untuk melakukan prediksi kualitas udara.
          </p>
        </div>
      </header>

      {/* Manual Input */}
      <Block
        title="Manual Input Data"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex flex-row gap-1 text-center ">
              <label
                htmlFor="tanggal-mulai"
                className="text-nowrap self-center"
              >
                Tanggal Mulai
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 p-1 text-center outline-none transition focus:border-gray-900"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex flex-row gap-1 text-center ">
              <label htmlFor="jumlah-hari" className="text-nowrap self-center">
                Jumlah Hari
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-300 p-1 text-center outline-none transition focus:border-gray-900"
                min={1}
                max={7}
                value={days}
                onChange={(e) =>
                  setDays(Math.max(1, Math.min(7, Number(e.target.value || 1))))
                }
              />
            </div>
          </div>
        }
      >
        {metInputs.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {MET_KEYS.map((k) => (
                    <th
                      key={k}
                      className="p-3 text-center font-display text-gray-700"
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="">
                {metInputs.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 text-center">
                      <Input
                        type="date"
                        value={r.tanggal}
                        onChange={(e) =>
                          updateRow("met", i, "tanggal", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={r.temperatur}
                        onChange={(e) =>
                          updateRow("met", i, "temperatur", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={r.kelembapan}
                        onChange={(e) =>
                          updateRow("met", i, "kelembapan", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={r.curah_hujan}
                        onChange={(e) =>
                          updateRow("met", i, "curah_hujan", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={r.penyinaran_matahari}
                        onChange={(e) =>
                          updateRow(
                            "met",
                            i,
                            "penyinaran_matahari",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.kecepatan_angin}
                        onChange={(e) =>
                          updateRow("met", i, "kecepatan_angin", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Pilih hari mulai dan jumlah hari
          </p>
        )}
      </Block>

      {/* CSV Uploaders */}
      <div className="grid gap-6 md:grid-cols-2">
        <Block
          title="Upload CSV – Data Meteorologi"
          actions={
            <SecondaryButton onClick={() => downloadTemplate("met")}>
              Download template
            </SecondaryButton>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            Kolom: tanggal, temperatur, kelembapan, curah_hujan,
            penyinaran_matahari, kecepatan_angin
          </p>
          <input
            type="file"
            accept=".csv"
            className="b border p-1 file:bg-blue-500 file:p-1 file:rounded-xl file:text-white"
            onChange={(e) =>
              e.target.files?.[0] && handleCSV(e.target.files[0], "met")
            }
          />
        </Block>
        <Block
          title="Upload CSV – Data Historis"
          actions={
            <SecondaryButton onClick={() => downloadTemplate("history")}>
              Download template
            </SecondaryButton>
          }
        >
          <p className="mb-3 text-sm text-gray-600">
            Kolom: tanggal, temperatur, kelembapan, curah_hujan,
            penyinaran_matahari, kecepatan_angin, PM10, SO2, CO, O3, NO2
          </p>
          <input
            type="file"
            accept=".csv"
            className="b border p-1 file:bg-blue-500 file:p-1 file:rounded-xl file:text-white"
            onChange={(e) =>
              e.target.files?.[0] && handleCSV(e.target.files[0], "history")
            }
          />
        </Block>
      </div>

      <Block title="Data Historis Manual (Opsional)">
        <div className="mb-3 flex items-center gap-2">
          <SecondaryButton onClick={addHistoryRow}>
            Tambahkan Data Historis
          </SecondaryButton>
        </div>
        {historyInputs.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[...MET_KEYS, "PM10", "SO2", "CO", "O3", "NO2"].map((k) => (
                    <th
                      key={k}
                      className="px-3 py-2 text-center font-display text-gray-700"
                    >
                      {k}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyInputs.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="date"
                        value={r.tanggal}
                        onChange={(e) =>
                          updateRow("history", i, "tanggal", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.temperatur}
                        onChange={(e) =>
                          updateRow("history", i, "temperatur", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.kelembapan}
                        onChange={(e) =>
                          updateRow("history", i, "kelembapan", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.curah_hujan}
                        onChange={(e) =>
                          updateRow("history", i, "curah_hujan", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.penyinaran_matahari}
                        onChange={(e) =>
                          updateRow(
                            "history",
                            i,
                            "penyinaran_matahari",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={r.kecepatan_angin}
                        onChange={(e) =>
                          updateRow(
                            "history",
                            i,
                            "kecepatan_angin",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    {["PM10", "SO2", "CO", "O3", "NO2"].map((k) => (
                      <td key={k} className="px-3 py-2  w-32">
                        <NumberInput
                          value={r[k]}
                          onChange={(e) =>
                            updateRow("history", i, k, e.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <SecondaryButton onClick={() => removeHistoryRow(i)}>
                        Remove
                      </SecondaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Belum ada data historis.</p>
        )}
      </Block>

      <Block title="Mulai Prediksi">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setPayload(buildPayload())}>
            Preview request body
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Proses..." : "Jalankan Prediksi"}
          </Button>
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
        {payload ? (
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-display">Request body preview</h3>
            <PreviewJSONCard data={payload} />
          </div>
        ) : null}
      </Block>


      {results ? (
        <Block title="Prediksi Polutan">
          <ResultsTable rows={results} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => downloadPredictionAsCSV(results)}>
              Donwload Prediksi
            </Button>
            <Button
              onClick={onSavePrediction}
              disabled={!rawPrediction || saveLoading}
            >
              {saveLoading ? "Menyimpan..." : "Simpan Prediksi"}
            </Button>
            <SecondaryButton onClick={onLoadSaved} disabled={loading}>
              Muat Hasil Tersimpan
            </SecondaryButton>
          </div>
          {saveMessage ? (
            <div className="mt-2 text-sm text-gray-700">{saveMessage}</div>
          ) : null}
        </Block>
      ) : null}

      {results ? (
        <Block title="Rangkuman ISPU">
          <div className="flex flex-col gap-4">
            <AQISummarySection data={results}></AQISummarySection>
          </div>
        </Block>
      ) : null}
    </section>
  );
}
