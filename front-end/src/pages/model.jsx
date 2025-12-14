import { useEffect, useState } from "react";
import { modelList, modelEvaluation, activateModel } from "../models/MLModel";
import MetricCard from "../components/MetricCards";
import Swal from "sweetalert2";

const ModelPage = () => {
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState("");
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_, setError] = useState("");

  const fetchModels = async () => {
    try {
      const response = await modelList();
      setModels(response.data.models);
      setActiveModel(response.data.active);
    } catch (err) {
      setError("Failed to load model list.");
      console.error(err);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const response = await modelEvaluation();
      setEvaluationData(response.data.evaluation);
    } catch (err) {
      setError("Failed to load active model evaluation.");
      console.error(err);
    }
  };

  const handleActivate = async (modelName) => {
    try {
      await activateModel(modelName);
      Swal.fire({
        title: "Success",
        text: `Model ${modelName} activated successfully`,
        icon: "success",
      });
      await fetchModels();
      await fetchEvaluation();
    } catch (err) {
      alert("Activation failed.");
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchModels();
      await fetchEvaluation();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return <p className="text-gray-600 p-6">Loading models...</p>;
  }

  return (
    <section className="min-h-screen bg-gray-50 p-6 font-display">
      <h1 className="text-3xl mb-6 text-gray-800 font-bold">
        Managemen Model
      </h1>

      {/* Active Model */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200 select-none">
        <h2 className="text-xl text-gray-700 font-bold">Model Aktif :</h2>
        <p className="text-lg text-green-600 mt-2">{activeModel}</p>
      </div>

      {/* Model List */}
      <h2 className="text-xl  mb-4 text-gray-800 text-center font-bold">Daftar Model</h2>
      <div className="overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="border-y">Nama Model</th>
              <th className="border-y">Created At</th>
              <th className="border-y">R2 Score</th>
              <th className="border-y">Status</th>
              <th className="border-y">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const isActive = model.name === activeModel;
              return (
                <tr key={model.name} className="text-center">
                  <td className="border-y">{model.name}</td>
                  <td className="border-y">{model.created_at}</td>
                  <td className="border-y">{model.overall.R2.toFixed(4)}</td>
                  <td className="border-y">
                    {isActive ? (
                      <span className="text-green-600 ">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-gray-500">Tidak Aktif</span>
                    )}
                  </td>
                  <td className="border-y p-2">
                    {isActive ? (
                      <button
                        className="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
                        disabled
                      >
                        Active
                      </button>
                    ) : (
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        onClick={() => handleActivate(model.name)}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl  mt-8 mb-4 text-gray-800 text-center font-bold">
        Evaluasi Model untuk Model "{activeModel}""
      </h2>

      {evaluationData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(evaluationData).map(([pollutant, metrics]) => (
            <MetricCard key={pollutant} title={pollutant} metrics={metrics} />
          ))}
        </div>
      ) : (
        <p>No evaluation data available.</p>
      )}
    </section>
  );
};

export default ModelPage;
