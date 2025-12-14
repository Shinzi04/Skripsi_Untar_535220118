import React, { useMemo, useState, useEffect } from "react";
import { getSavedPrediction } from "../models/MLModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Wind,
  CloudSun,
  Gauge,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

// --- Utilities ---
const parseDMY = (str) => {
  const [d, m, y] = str.split("/").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
};

const toDMY = (isoStr) => {
  const d = new Date(isoStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const computeScore = ({ PM10, SO2, CO, O3, NO2 }) => {
  const BP_CONC = {
    PM10: [0, 50, 150, 350, 420, 500],
    SO2: [0, 52, 180, 400, 800, 1200],
    CO: [0, 4000, 8000, 15000, 30000, 45000],
    O3: [0, 120, 235, 400, 800, 1000],
    NO2: [0, 80, 200, 1130, 2260, 3000],
  };

  const BP_INDEX = [0, 50, 100, 200, 300, 500];

  const calcSubIndex = (value, concBreakpoints) => {
    const x = Math.max(0, value ?? 0);
    let i = 0;
    while (i < concBreakpoints.length - 1 && x > concBreakpoints[i + 1]) {
      i++;
    }
    const Cl = concBreakpoints[i];
    const Ch = concBreakpoints[i + 1] ?? concBreakpoints[i];
    const Il = BP_INDEX[i];
    const Ih = BP_INDEX[i + 1] ?? BP_INDEX[i];

    if (Ch === Cl) return Il;
    const I = ((Ih - Il) / (Ch - Cl)) * (x - Cl) + Il;
    return Math.round(I);
  };

  const sPM10 = calcSubIndex(PM10, BP_CONC.PM10);
  const sSO2 = calcSubIndex(SO2, BP_CONC.SO2);
  const sCO = calcSubIndex(CO, BP_CONC.CO);
  const sO3 = calcSubIndex(O3, BP_CONC.O3);
  const sNO2 = calcSubIndex(NO2, BP_CONC.NO2);

  return Math.max(sPM10, sSO2, sCO, sO3, sNO2);
};

const scoreToCategory = (s) => {
  if (s <= 50)
    return { name: "Baik", color: "from-emerald-500 to-emerald-600" };
  if (s <= 100)
    return { name: "Sedang", color: "from-yellow-400 to-amber-500" };
  if (s <= 150)
    return { name: "Tidak Sehat", color: "from-orange-500 to-amber-600" };
  if (s <= 200)
    return { name: "Sangat Tidak Sehat", color: "from-red-500 to-rose-600" };
  if (s <= 300)
    return { name: "Berbahaya", color: "from-fuchsia-600 to-purple-700" };
  return { name: "Berbahaya", color: "from-slate-800 to-black" };
};

const prettyDate = (dmy) => {
  const d = parseDMY(dmy);
  return d.toLocaleDateString("id", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const metricPalette = (metric) => {
  const map = {
    PM10: { stroke: "#10b981", stops: ["#34d399", "#059669"] }, // emerald
    SO2: { stroke: "#f59e0b", stops: ["#fbbf24", "#d97706"] }, // amber
    CO: { stroke: "#3b82f6", stops: ["#60a5fa", "#2563eb"] }, // blue
    O3: { stroke: "#a855f7", stops: ["#c084fc", "#7c3aed"] }, // purple
    NO2: { stroke: "#ef4444", stops: ["#f87171", "#b91c1c"] }, // red
    default: { stroke: "#111827", stops: ["#6b7280", "#111827"] }, // slate/gray
  };
  return map[metric] || map.default;
};

// --- Components ---
const AQIBadge = ({ label, value }) => (
  <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/30 px-3 py-1">
    <span className="text-xs text-white/90">{label}</span>
    <span className="font-semibold text-white tabular-nums">{value}</span>
  </div>
);

const AQICard = ({ item }) => {
  const score = computeScore(item);
  const cat = scoreToCategory(score);
  return (
    <motion.div
      layout
      className={`relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br ${cat.color} p-5 shadow-xl ring-1 ring-black/5 text-white`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_40%)]" />
      <div className="relative z-10 flex h-full flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Kartu ISPU</h3>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {prettyDate(item.date)}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-extrabold leading-none tracking-tight tabular-nums">
              {score}
            </div>
            <div className="mt-1 text-sm font-medium opacity-90">
              {cat.name}
            </div>
          </div>
          <div className="flex gap-2 opacity-90">
            <Leaf className="h-5 w-5" />
            <Wind className="h-5 w-5" />
            <CloudSun className="h-5 w-5" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AQIBadge label="PM10" value={item.PM10} />
          <AQIBadge label="SO₂" value={item.SO2} />
          <AQIBadge label="CO" value={item.CO} />
          <AQIBadge label="O₃" value={item.O3} />
          <AQIBadge label="NO₂" value={item.NO2} />
        </div>
      </div>
    </motion.div>
  );
};

const MultiCardCarousel = ({ items, perPage = 3 }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const prev = () => setPage((p) => (p - 1 + totalPages) % totalPages);
  const next = () => setPage((p) => (p + 1) % totalPages);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages]);

  const start = page * perPage;
  const pageItems = items.slice(start, start + perPage);

  const drag = {
    drag: "x",
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.2,
    onDragEnd: (_, info) => {
      if (info.offset.x > 80) prev();
      else if (info.offset.x < -80) next();
    },
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {page + 1} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="rounded-full border border-gray-200 bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
            aria-label="Previous"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="rounded-full border border-gray-200 bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
            aria-label="Next"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={page}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          {...drag}
        >
          {pageItems.map((it) => (
            <AQICard key={it.date} item={it} />
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === page ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const POLLUTANTS = ["PM10", "SO2", "CO", "O3", "NO2"];

const pollutantLabels = {
  PM10: "PM10 (Particulate Matter)",
  SO2: "SO₂ (Sulfur Dioksida)",
  CO: "CO (Karbon Monoksida)",
  O3: "O₃ (Ozon)",
  NO2: "NO₂ (Nitrogen Dioksida)",
};

const SubplotChart = ({ data, pollutant }) => {
  const gradId = `grad-${pollutant}`;
  const pal = metricPalette(pollutant);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          {pollutantLabels[pollutant]}
        </span>
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: pal.stroke }}
        />
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, left: 0, right: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pal.stops[0]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={pal.stops[1]} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              interval={Math.ceil(data.length / 4)}
            />
            <YAxis tick={{ fontSize: 9 }} width={32} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey={pollutant}
              stroke={pal.stroke}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const TopTrend = ({ data }) => {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-100 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-800">
          Tren Semua Polutan
        </span>
        <span className="text-xs text-gray-500">(Prediksi dalam hari)</span>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {POLLUTANTS.map((pollutant) => (
          <SubplotChart key={pollutant} data={data} pollutant={pollutant} />
        ))}
      </div>
    </div>
  );
};

const BarPanel = ({ data }) => {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-100 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">
          Bar Chart Semua Polutan
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, left: 8, right: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval={Math.ceil(data.length / 6)}
            />
            <YAxis tick={{ fontSize: 10 }} width={28} />
            <Tooltip />
            {POLLUTANTS.map((k) => {
              const pal = metricPalette(k);
              return <Bar key={k} dataKey={k} fill={pal.stops[0]} />;
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DataTable = ({ data }) => {
  const cols = ["Tanggal", "PM10", "SO2", "CO", "O3", "NO2", "AQI"];
  const rows = data.map((d) => ({ ...d, AQI: computeScore(d) }));
  return (
    <div className="overflow-x-auto rounded-3xl border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="px-4 py-3 font-semibold uppercase tracking-wide text-xs"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.date} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">{prettyDate(r.date)}</td>
              <td className="px-4 py-2 tabular-nums">{r.PM10}</td>
              <td className="px-4 py-2 tabular-nums">{r.SO2}</td>
              <td className="px-4 py-2 tabular-nums">{r.CO}</td>
              <td className="px-4 py-2 tabular-nums">{r.O3}</td>
              <td className="px-4 py-2 tabular-nums">{r.NO2}</td>
              <td className="px-4 py-2 tabular-nums font-semibold">{r.AQI}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Page ---

const UserPage = () => {
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await getSavedPrediction();
        const mapped = (response?.predictions ?? []).map((p) => ({
          date: toDMY(p.Tanggal),
          PM10: Number(p.PM10.toFixed(4)),
          SO2: Number(p.SO2.toFixed(4)),
          CO: Number(p.CO.toFixed(4)),
          O3: Number(p.O3.toFixed(4)),
          NO2: Number(p.NO2.toFixed(4)),
        }));
        if (alive) {
          setApiData(
            mapped.slice().sort((a, b) => parseDMY(a.date) - parseDMY(b.date))
          );
        }
      } catch (e) {
        if (alive) setError(e?.message || "Gagal memuat data prediksi.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fallbacks & guards
  const data = apiData; // already sorted
  const empty = !loading && !error && data.length === 0;

  const aqiSummary = useMemo(
    () => data.map((d) => ({ date: d.date, score: computeScore(d) })),
    [data]
  );
  const bestDay = useMemo(
    () =>
      aqiSummary.reduce(
        (min, cur) => (cur.score < min.score ? cur : min),
        aqiSummary[0]
      ),
    [aqiSummary]
  );

  // You can style these placeholders as you like
  if (loading) {
    return (
      <div className="min-h-screen w-full grid place-items-center text-gray-600">
        Memuat prediksi…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full grid place-items-center text-red-600">
        Terjadi kesalahan: {error}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="min-h-screen w-full grid place-items-center text-gray-600">
        Tidak ada data prediksi untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Prediksi Indeks Standar Pencemaran Udara
            </h1>
          </div>
        </header>

        {/* Top metrics row */}
        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-gray-100 p-5">
            <div className="text-sm text-gray-600">
              Hari Terbaik (Skor Terendah)
            </div>
            <div className="mt-2 text-3xl font-bold">{bestDay.score}</div>
            <div className="text-xs text-gray-500">
              {prettyDate(bestDay.date)}
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-gray-100 p-5">
            <div className="text-sm text-gray-600">Rentang tanggal</div>
            <div className="mt-2 text-lg font-semibold">
              {prettyDate(data[0].date)} –{" "}
              {prettyDate(data[data.length - 1].date)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Total {data.length} hari
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-gray-100 p-5">
            <div className="text-sm text-gray-600">Rata-rata skor</div>
            <div className="mt-2 text-3xl font-bold">
              {Math.round(
                aqiSummary.reduce((sum, d) => sum + d.score, 0) /
                  aqiSummary.length
              )}
            </div>
            <div className="text-xs text-gray-500">Heuristik gaya AQI</div>
          </div>
        </section>

        {/* Carousel (TOP) */}
        <section className="mb-10">
          <MultiCardCarousel items={data} perPage={3} />
        </section>

        {/* Line Trend */}
        <section className="mb-10">
          <TopTrend data={data} />
        </section>

        {/* Bar Chart */}
        <section className="mb-10">
          <BarPanel data={data} />
        </section>

        {/* Full Data Table */}
        <section className="mb-20">
          <DataTable data={data} />
        </section>
      </div>
    </div>
  );
};

export default UserPage;
