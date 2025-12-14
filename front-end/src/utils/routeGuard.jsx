import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLoggedIn } from "../models/AuthModel";

export default function RequireAuth() {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
