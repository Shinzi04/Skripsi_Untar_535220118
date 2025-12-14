// === ISPU (Indonesia) breakpoints in µg/m³ (24-jam) ===
// Source: Permen LHK P.14/2020 — use linear interpolation per segment
const _ISPU_INDEXES = [0, 50, 100, 200, 300, 500];

const _makeRanges = (concs, idxs = _ISPU_INDEXES) =>
  concs.slice(0, -1).map((Clow, i) => ({
    Clow,
    Chigh: concs[i + 1],
    Ilow: idxs[i],
    Ihigh: idxs[i + 1],
  }));

const AQI_BREAKPOINTS = {
  PM10: _makeRanges([0, 50, 150, 350, 420, 500]),
  SO2: _makeRanges([0, 52, 180, 400, 800, 1200]),
  CO: _makeRanges([0, 4000, 8000, 15000, 30000, 45000]),
  O3: _makeRanges([0, 120, 235, 400, 800, 1000]),
  NO2: _makeRanges([0, 80, 200, 1130, 2260, 3000]),
};

// Linear interpolation with clamping negatives to 0
const calcAQIFromBreakpoints = (C, ranges) => {
  const x = Math.max(0, C ?? 0);
  let r = ranges.find((seg) => x >= seg.Clow && x <= seg.Chigh);
  if (!r) {
    // below first → first segment; above last → last segment
    r = x < ranges[0].Clow ? ranges[0] : ranges[ranges.length - 1];
  }
  const { Clow, Chigh, Ilow, Ihigh } = r;
  if (Chigh === Clow) return Ilow;
  const I = ((Ihigh - Ilow) / (Chigh - Clow)) * (x - Clow) + Ilow;
  return Math.round(I);
};

// ISPU categories
const aqiCategory = (aqi) => {
  if (aqi <= 50) return "Baik";
  if (aqi <= 100) return "Sedang";
  if (aqi <= 200) return "Tidak Sehat";
  if (aqi <= 300) return "Sangat Tidak Sehat";
  return "Berbahaya";
};

// Compute per-pollutant sub-indexes and overall ISPU (max rule)
const computeAQIs = (row) => {
  // Expecting concentrations in µg/m³ (24-jam) for PM10, SO2, CO, O3, NO2
  // NOTE: remove any ppm conversions — these breakpoints are already in µg/m³.
  const values = {
    PM10: row.PM10,
    O3: row.O3,
    CO: row.CO,
    SO2: row.SO2,
    NO2: row.NO2,
  };

  const perAQI = {};
  if (typeof values.PM10 === "number")
    perAQI.PM10_AQI = calcAQIFromBreakpoints(values.PM10, AQI_BREAKPOINTS.PM10);
  if (typeof values.O3 === "number")
    perAQI.O3_AQI = calcAQIFromBreakpoints(values.O3, AQI_BREAKPOINTS.O3);
  if (typeof values.CO === "number")
    perAQI.CO_AQI = calcAQIFromBreakpoints(values.CO, AQI_BREAKPOINTS.CO);
  if (typeof values.SO2 === "number")
    perAQI.SO2_AQI = calcAQIFromBreakpoints(values.SO2, AQI_BREAKPOINTS.SO2);
  if (typeof values.NO2 === "number")
    perAQI.NO2_AQI = calcAQIFromBreakpoints(values.NO2, AQI_BREAKPOINTS.NO2);

  const entries = Object.entries(perAQI);
  if (!entries.length) return { AQI: null, Dominant: null, Category: null };

  const mapped = entries.map(([k, v]) => [k.replace("_AQI", ""), v]);
  const [Dominant, AQI] = mapped.reduce((acc, cur) =>
    cur[1] > acc[1] ? cur : acc
  );
  return { AQI, Dominant, Category: aqiCategory(AQI), ...perAQI };
};

const enrichWithAQI = (row) => {
  return { ...row, ...computeAQIs(row) };
};

export { enrichWithAQI };
