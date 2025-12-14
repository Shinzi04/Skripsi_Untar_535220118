import axios from "axios";
import CONFIG from "../data/config";
import { getToken } from "./AuthModel";
const BASE_URL = CONFIG.BASE_URL;

export const modelEvaluation = async () => {
  try {
    const response = axios.get(`${BASE_URL}/model/evaluation`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const modelList = async () => {
  try {
    const response = axios.get(`${BASE_URL}/model/list`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const activateModel = async (modelName) => {
  try {
    const response = axios.patch(
      `${BASE_URL}/model/active`,
      { active: modelName },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const uploadDataModel = async (file) => {
  if (!(file instanceof File)) throw new Error("expects a File instance.");
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Only .csv files are allowed.");
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const { data } = await axios.post(`${BASE_URL}/model/upload`, form, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!data?.base_name) {
      throw new Error("Server tidak mengembalikan base_name");
    }
    return data.base_name;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const trainUsingCache = async (baseName, modelName) => {
  if (!baseName) throw new Error("base_name is required.");

  const body = { base_name: baseName };
  if (modelName && modelName.trim()) body.model_name = modelName.trim();

  const { data } = await axios.post(`${BASE_URL}/model/train`, body, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  return data; // { message, base_name, model_name }
};

export const modelPredict = async (data) => {
  const response = await axios.post(`${BASE_URL}/model/predict`, data, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};

export const savePrediction = async (data) => {
  const response = await axios.patch(`${BASE_URL}/model/predict/result`, data, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};

export const getSavedPrediction = async () => {
  const response = await axios.get(`${BASE_URL}/model/predict/result`);
  return response.data;
};
