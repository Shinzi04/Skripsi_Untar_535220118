import React, { useEffect, useState } from "react";
import { uploadDataModel, trainUsingCache } from "../models/MLModel";
import { validateCsvHeaders, EXPECTED_HEADERS } from "../utils/validateCSV";
import Swal from "sweetalert2";

const CACHE_KEY = "ml_base_name";

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // training state
  const [cachedBaseName, setCachedBaseName] = useState("");
  const [trainStatus, setTrainStatus] = useState("idle");
  const [trainError, setTrainError] = useState("");
  const [modelName, setModelName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) setCachedBaseName(saved);
  }, []);

  const handleSelect = (e) => {
    const f = e.target.files?.[0] || null;
    setErrorMsg("");
    setStatus("idle");
    if (!f) return setFile(null);

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setStatus("error");
      setErrorMsg("Only .csv files are allowed.");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    try {
      await validateCsvHeaders(file, { enforceOrder: true });

      const base_name = await uploadDataModel(file);
      localStorage.setItem(CACHE_KEY, base_name);
      setCachedBaseName(base_name);

      setStatus("done");
      Swal.fire({
        title: "Upload Berhasil",
        text: `Data tersimpan. Siap melatih model untuk dataset: ${base_name}`,
        icon: "success",
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err?.response?.data?.detail || err?.message || "Upload failed"
      );
    }
  };

  const handleTrain = async () => {
    if (!cachedBaseName || trainStatus === "training") return;

    setTrainStatus("training");
    setTrainError("");

    try {
      const res = await trainUsingCache(cachedBaseName, modelName);
      setTrainStatus("done");
      Swal.fire({
        title: "Pelatihan Selesai",
        text: `Model dilatih dengan nama: ${res?.model_name} (dataset: ${res?.base_name})`,
        icon: "success",
      });
    } catch (err) {
      setTrainStatus("error");
      setTrainError(
        err?.response?.data?.detail || err?.message || "Training failed"
      );
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    setCachedBaseName("");
    setTrainStatus("idle");
    setTrainError("");
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <section className="p-6 bg-white font-display">
      <section className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900 uppercase">
              Unggah Data
            </h2>
            <p className="text-gray-600 text-sm">
              Unggah data untuk pelatihan model
            </p>
          </header>

          <input
            type="file"
            accept=".csv"
            onChange={handleSelect}
            disabled={status === "uploading"}
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
          />

          {file && (
            <div className="mt-3 text-sm text-gray-700">
              <div className="font-medium">{file.name}</div>
              <div className="text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!file || status === "uploading"}
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === "uploading" ? "Uploading..." : "Unggah Data"}
            </button>
            <button
              onClick={reset}
              disabled={status === "uploading"}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>

          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">Error: {errorMsg}</p>
          )}
          {status === "done" && (
            <p className="mt-3 text-sm text-green-600">
              Upload selesai. Base name:{" "}
              <span className="font-semibold">{cachedBaseName}</span>
            </p>
          )}

          <div className="mt-5 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-700 mb-1">
              Kolom yang diperlukan:
            </p>
            <p className="text-xs text-gray-600">
              {EXPECTED_HEADERS.join(" | ")}
            </p>
          </div>
        </div>

        {/* Langkah 2: Latih Model */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900 uppercase">
              Latih Model
            </h2>
            <p className="text-gray-600 text-sm">
              Latih model menggunakan data yang telah diunggah
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Model (opsional)
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="contoh: Model_Prediksi_2"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Jika dikosongkan, nama model akan menggunakan nama file:
                <code className="px-1">{cachedBaseName || "—"}</code>
              </p>
            </div>
          </header>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Dataset aktif:</span>
            <code className="px-2 py-1 rounded bg-gray-100 text-gray-800">
              {cachedBaseName || "—"}
            </code>
            {cachedBaseName && (
              <button
                onClick={clearCache}
                className="ml-auto inline-flex items-center rounded-xl border px-3 py-1.5 hover:bg-gray-50"
              >
                Hapus Cache
              </button>
            )}
          </div>

          {/* <div className="mt-4 flex gap-2">
            <button
              onClick={handleTrain}
              disabled={!cachedBaseName || trainStatus === "training"}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {trainStatus === "training" ? "Sedang Melatih..." : "Latih Model"}
            </button>
          </div>

          {trainStatus === "error" && (
            <p className="mt-3 text-sm text-red-600">Error: {trainError}</p>
          )}
          {trainStatus === "done" && (
            <p className="mt-3 text-sm text-green-600">Pelatihan selesai.</p>
          )} */}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleTrain}
              disabled={!cachedBaseName || trainStatus === "training"}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {trainStatus === "training" ? "Sedang Melatih..." : "Latih Model"}
            </button>
          </div>

          {trainStatus === "training" && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  Melatih model...
                </span>
              </div>

              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 animate-pulse"></div>
                <div
                  className="absolute inset-0 bg-emerald-600 animate-[shimmer_2s_ease-in-out_infinite]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s ease-in-out infinite",
                  }}
                ></div>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-emerald-700">
                  <span className="font-medium">
                    💡 Proses sedang berjalan:
                  </span>{" "}
                  Model sedang dilatih menggunakan BI-LSTM.
                  Harap tunggu...
                </p>
              </div>
            </div>
          )}

          {trainStatus === "error" && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">
                <span className="font-medium">❌ Error:</span> {trainError}
              </p>
            </div>
          )}
          {trainStatus === "done" && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 animate-[fadeIn_0.5s_ease-in]">
              <p className="text-sm text-green-600">
                <span className="font-medium">✅ Pelatihan selesai!</span> Model
                siap digunakan untuk prediksi.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default UploadPage;
