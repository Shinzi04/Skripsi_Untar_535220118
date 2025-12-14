// src/pages/routes.jsx
import AppLayout from "../layouts/AppLayout";
import RequireAuth from "../utils/routeGuard";

import AboutPage from "./about";
import UploadPage from "./upload";
import HomePage from "./home";
import LoginPage from "./login";
import ModelPage from "./model";
import UserPage from "./view";

export const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <UserPage /> },
      { path: "/about", element: <AboutPage /> },

      {
        element: <RequireAuth />,
        children: [
          { path: "/upload", element: <UploadPage /> },
          { path: "/model", element: <ModelPage /> },
          { path: "/home", element: <HomePage /> },
        ],
      },

      { path: "/login", element: <LoginPage /> },
    ],
  },
];
