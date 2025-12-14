const MetricCard = ({ title, metrics }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform  hover:shadow-xl transition-all duration-300 font-display">
    {/* Header */}
    <div className="bg-black px-4 py-1 font-bold">
      <h3 className="text-lg  text-white tracking-wide drop-shadow-md">
        {title}
      </h3>
    </div>

    {/* Content */}
    <div className="p-4 ">
      <table className="w-full text-md text-left">
        <tbody>
          {Object.entries(metrics).map(([key, value], index) => (
            <tr
              key={key}
              className={`transition-colors duration-200 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              } hover:bg-indigo-50`}
            >
              <td className="font-semibold text-gray-700 uppercase tracking-wide">
                {key}
              </td>
              <td className="py-2 px-3 text-gray-900 font-mono">
                {Number(value).toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default MetricCard;
