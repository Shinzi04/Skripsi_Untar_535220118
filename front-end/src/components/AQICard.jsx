import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const aqiColor = (aqi) => {
  if (aqi == null) return "bg-gray-200 text-gray-800";
  if (aqi <= 50) return "bg-green-100 text-green-800";
  if (aqi <= 100) return "bg-yellow-100 text-yellow-800";
  if (aqi <= 150) return "bg-orange-100 text-orange-800";
  if (aqi <= 200) return "bg-red-100 text-red-800";
  if (aqi <= 300) return "bg-purple-100 text-purple-800";
  return "bg-rose-100 text-rose-800";
};

const AQISummarySection = ({ data }) => {
  if (!data?.length) return null;

  const chartData = data.map((r) => ({
    tanggal: new Date(r.Tanggal).toLocaleDateString(),
    ISPU: r.AQI ?? null,
    Dominant: r.Dominant || "-",
  }));

  return (
    <>
      <div className="md:col-span-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 300]} />
            <Tooltip
              formatter={(v) => (Number.isFinite(v) ? Math.round(v) : v)}
            />
            <Line type="monotone" dataKey="ISPU" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <div className="text-sm font-medium">
                {new Date(r.Tanggal).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-600">
                Polutan Dominan:{" "}
                <span className="font-semibold">{r.Dominant || "-"}</span>
              </div>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-sm font-semibold ${aqiColor(
                r.AQI
              )}`}
            >
              AQI {r.AQI != null ? Math.round(r.AQI) : "-"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AQISummarySection;
