import { useState } from "react";
import { Wind, Droplets, Sun, CloudRain, Thermometer } from "lucide-react";

const AboutPage = () => {
  const [activeTab, setActiveTab] = useState("pollutants");

  const pollutants = [
    {
      name: "PM₁₀",
      fullName: "Particulate Matter 10",
      icon: "🌫️",
      color: "from-slate-400 to-slate-600",
      desc: "Partikel debu halus berdiameter ≤10 mikrometer",
      source: "Asap kendaraan, industri, debu jalanan",
      impact: "Masuk ke saluran pernapasan, iritasi paru-paru",
      danger: "Dapat memicu asma dan penyakit pernapasan kronis",
    },
    {
      name: "O₃",
      fullName: "Ozon Troposfer",
      icon: "☀️",
      color: "from-blue-400 to-cyan-600",
      desc: "Gas yang terbentuk dari reaksi kimia di atmosfer bawah",
      source: "Reaksi NOₓ & VOC dengan sinar matahari",
      impact: "Mengiritasi mata, hidung, tenggorokan",
      danger: "Merusak jaringan paru-paru pada paparan tinggi",
    },
    {
      name: "NO₂",
      fullName: "Nitrogen Dioksida",
      icon: "🚗",
      color: "from-orange-400 to-red-600",
      desc: "Gas berwarna coklat kemerahan hasil pembakaran",
      source: "Kendaraan bermotor, pembangkit listrik",
      impact: "Radang saluran pernapasan",
      danger: "Menurunkan fungsi paru-paru, terutama pada anak-anak",
    },
    {
      name: "SO₂",
      fullName: "Sulfur Dioksida",
      icon: "🏭",
      color: "from-yellow-400 to-amber-600",
      desc: "Gas tak berwarna dengan bau tajam menyengat",
      source: "Pembakaran batu bara, industri peleburan",
      impact: "Iritasi mata dan saluran pernapasan",
      danger: "Dapat memicu serangan asma dan bronkitis",
    },
    {
      name: "CO",
      fullName: "Karbon Monoksida",
      icon: "💨",
      color: "from-gray-400 to-gray-700",
      desc: "Gas tak berwarna, tak berbau, sangat beracun",
      source: "Pembakaran tidak sempurna di kendaraan",
      impact: "Mengikat hemoglobin, mengurangi oksigen dalam darah",
      danger: "Pusing, sakit kepala, bahkan kematian pada kadar tinggi",
    },
  ];

  const meteoData = [
    {
      name: "Temperatur",
      icon: <Thermometer className="w-6 h-6" />,
      color: "from-red-400 to-orange-500",
      desc: "Suhu udara ambient",
      influence: "Suhu tinggi mempercepat reaksi kimia pembentukan O₃",
      range: "20-35°C (tropis)",
    },
    {
      name: "Kelembapan",
      icon: <Droplets className="w-6 h-6" />,
      color: "from-blue-400 to-blue-600",
      desc: "Kadar uap air di udara",
      influence: "Kelembapan tinggi dapat mengendapkan polutan",
      range: "60-90% (iklim Indonesia)",
    },
    {
      name: "Curah Hujan",
      icon: <CloudRain className="w-6 h-6" />,
      color: "from-indigo-400 to-blue-700",
      desc: "Intensitas presipitasi",
      influence: 'Hujan "mencuci" polutan dari atmosfer',
      range: "0-50+ mm/hari",
    },
    {
      name: "Penyinaran Matahari",
      icon: <Sun className="w-6 h-6" />,
      color: "from-yellow-300 to-yellow-500",
      desc: "Durasi dan intensitas sinar matahari",
      influence: "Sinar UV memicu fotokimia untuk pembentukan ozon",
      range: "4-10 jam/hari",
    },
    {
      name: "Kecepatan Angin",
      icon: <Wind className="w-6 h-6" />,
      color: "from-teal-400 to-cyan-600",
      desc: "Kecepatan pergerakan massa udara",
      influence: "Angin kencang menyebarkan & mengencerkan polutan",
      range: "0-15 m/s (rata-rata)",
    },
  ];

  return (
    <section className="relative overflow-hidden p-6 md:p-10 rounded-3xl font-display">
      <header>
        <h1 className="text-3xl md:text-5xl font-semibold text-slate-800 tracking-tight">
          About
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Prediksi kualitas udara berbasis{" "}
          <span className="font-semibold">BI-LSTM</span> yang memadukan data
          ISPU dan meteorologi untuk hasil yang akurat, ringkas, dan mudah
          diinterpretasi.
        </p>
      </header>

      <section className="mt-10 grid gap-6 md:grid-cols-2 border border-gray-200 bg-white p-5 shadow-sm rounded-2xl">
        <div className="p-6 rounded-2xl bg-white glow transition-transform">
          <div className="flex items-center gap-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 15a8 8 0 1116 0v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3z"
                stroke="currentColor"
                className="text-indigo-600"
                strokeWidth="1.5"
              />
              <path
                d="M8 20V9a4 4 0 118 0v11"
                stroke="currentColor"
                className="text-indigo-600"
                strokeWidth="1.5"
              />
            </svg>
            <h3 className="text-xl font-semibold text-slate-800">
              Data yang Dipakai
            </h3>
          </div>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-700">
            <li>
              <span className="font-medium">ISPU:</span> konsentrasi PM
              <sub>10</sub>, O<sub>3</sub>, NO<sub>2</sub>, SO
              <sub>2</sub>, CO dari
              <a
                href="https://lingkunganhidup.jogjakota.go.id/page/index/basis-data-lingkungan-hidup"
                className="f text-blue-500 pl-1"
              >
                Dinas Lingkungan Hidup Kota Yogyakarta
              </a>
            </li>
            <li>
              <span className="font-medium">Meteorologi:</span> Temperatur,
              Kelembapan, Curah Hujan, Penyinaran Matahari, Kecepatan Angin dari
              <a
                href="https://dataonline.bmkg.go.id/"
                className="f text-blue-500 pl-1"
              >
                Data Online BMKG
              </a>
            </li>
          </ul>
        </div>

        {/* Algorithm card */}
        <div className="p-6 rounded-2xl bg-white transition-transform">
          <div className="flex items-center gap-3">
            {/* BiLSTM icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <rect
                x="3"
                y="5"
                width="6"
                height="14"
                rx="2"
                stroke="currentColor"
                className="text-sky-600"
                strokeWidth="1.5"
              />
              <rect
                x="15"
                y="5"
                width="6"
                height="14"
                rx="2"
                stroke="currentColor"
                className="text-sky-600"
                strokeWidth="1.5"
              />
              <path
                d="M9 12h6"
                stroke="currentColor"
                className="text-sky-600"
                strokeWidth="1.5"
              />
            </svg>
            <h3 className="text-xl font-semibold text-slate-800">
              Algoritma: BI-LSTM
            </h3>
          </div>
          <p className="text-slate-700 mt-3">
            <span className="font-semibold">Bidirectional LSTM</span> membaca
            deret waktu dari dua arah (maju & mundur) untuk menangkap konteks
            masa lalu dan masa depan sekaligus—efektif pada pola harian/musiman
            dan kejadian cuaca yang memengaruhi polutan.
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1 text-slate-700">
            <li>Stabil pada urutan panjang.</li>
            <li>Lebih tanggap terhadap perubahan cuaca.</li>
          </ul>
        </div>
      </section>

      {/* Step-by-step timeline */}
      <section className="mt-10 p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h3 className="text-xl font-semibold text-slate-800">Alur Prediksi</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            {
              t: "DATA",
              d: "Gabungkan ISPU & Meteorologi (BMKG) → menyamakan waktu & mengisi nilai yang hilang.",
            },
            {
              t: "NORMALISASI",
              d: "Menskalakan fitur dengan Min-Max Scaler agar rentang senilai dan pelatihan stabil.",
            },
            {
              t: "PELATIHAN",
              d: "Latih model dengan arsitektur BI-LSTM untuk prediksi kualitas udara.",
            },
            {
              t: "PREDIKSI",
              d: "Denormalisasi keluaran (polutan), tampilkan hasil prediksi, dan hitung nilai ISPU.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="relative p-5 rounded-2xl border from-slate-50 to-white transition-shadow hover:shadow-md hover:scale-105 duration-1000"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white grid place-items-center font-semibold">
                  {i + 1}
                </div>
                <div className="font-semibold text-slate-800">{s.t}</div>
              </div>
              <p className="mt-3 text-slate-700 text-sm leading-relaxed">
                {s.d}
              </p>
              {i < 3 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-0 w-0 border-y-8 border-y-transparent border-l-8 border-l-slate-200" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Penjelasan Polutan & Meteorologi */}
      <section className="mt-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-2">
            Memahami Data yang Digunakan
          </h2>
          <p className="text-slate-600">
            Kenali polutan udara dan faktor cuaca yang memengaruhi prediksi
            kualitas udara
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-6">
          <button
            onClick={() => setActiveTab("pollutants")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "pollutants"
                ? "bg-indigo-600 text-white shadow-lg scale-105"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-gray-200"
            }`}
          >
            🌫️ Polutan ISPU
          </button>
          <button
            onClick={() => setActiveTab("weather")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "weather"
                ? "bg-sky-600 text-white shadow-lg scale-105"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-gray-200"
            }`}
          >
            ☁️ Data Meteorologi
          </button>
        </div>

        {/* Content */}
        {activeTab === "pollutants" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pollutants.map((p, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`text-4xl bg-gradient-to-br ${p.color} w-16 h-16 rounded-xl flex items-center justify-center shadow-md`}
                  >
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500">{p.fullName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Apa itu?
                    </p>
                    <p className="text-sm text-slate-600">{p.desc}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-700 mb-1">
                      Sumber
                    </p>
                    <p className="text-sm text-slate-600">{p.source}</p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-amber-700 mb-1">
                      Dampak
                    </p>
                    <p className="text-sm text-slate-600">{p.impact}</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-3 border-l-4 border-red-400">
                    <p className="text-sm font-semibold text-red-700 mb-1">
                      ⚠️ Bahaya
                    </p>
                    <p className="text-sm text-slate-600">{p.danger}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meteoData.map((m, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`bg-gradient-to-br ${m.color} w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-md`}
                  >
                    {m.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {m.name}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Definisi
                    </p>
                    <p className="text-sm text-slate-600">{m.desc}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-700 mb-1">
                      Pengaruh Terhadap Polutan
                    </p>
                    <p className="text-sm text-slate-600">{m.influence}</p>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-3 border-l-4 border-teal-400">
                    <p className="text-sm font-semibold text-teal-700 mb-1">
                      📊 Rentang Nilai
                    </p>
                    <p className="text-sm text-slate-600">{m.range}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default AboutPage;
