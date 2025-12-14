// src/models/AuthModel.js
import { useSyncExternalStore } from "react";
import axios from "axios";
import CONFIG from "../data/config";

const BASE_URL = CONFIG.BASE_URL;
const KEY = "token";

export const getToken = () => localStorage.getItem(KEY);
function setToken(token) {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("authchange"));
}

export const loginAdmin = async (username, password) => {
  try {
    const response = await axios.postForm(`${BASE_URL}/auth/login`, {
      username,
      password,
    });
    const token = response?.data?.access_token;
    if (!token) throw new Error("No access token returned");
    setToken(token);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error.message;
    console.error("Login error:", message);
    throw new Error(message);
  }
};

export function logout() {
  setToken(null);
}

export function isLoggedIn() {
  return !!getToken();
}

/* -------------------- HOOK -------------------- */
const subscribe = (callback) => {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("authchange", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("authchange", handler);
  };
};

const getSnapshot = () => getToken();

export const useAuth = () => {
  const token = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { token, loggedIn: !!token };
};

export const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
