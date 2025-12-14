const PreviewJSONCard = ({ data }) => {
  function compactArrayStringify(key, value) {
    if (Array.isArray(value)) {
      return `[${value.join(", ")}]`;
    }
    return value;
  }

  const jsonString = JSON.stringify(data, compactArrayStringify, 2).replace(
    /"\\[(.*?)\\]"/g,
    "[$1]"
  );

  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
      {jsonString}
    </pre>
  );
};

export default PreviewJSONCard;
