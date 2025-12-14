import CONFIG from "../data/config";
import axios from "axios";
import { getToken } from "./AuthModel";

const BASE_URL = CONFIG.BASE_URL;

export const uploadFile = async (file) => {
  if (!(file instanceof File)) {
    throw new Error("expects a File instance.");
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const response = axios.post(`${BASE_URL}/upload`, form, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getBucketList = async () => {
  try {
    const response = axios.get(`${BASE_URL}/upload/list`);
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
