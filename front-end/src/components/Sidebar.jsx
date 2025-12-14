// src/components/Sidebar.jsx
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout, useAuth } from "../models/AuthModel";

const linkBase =
  "block transition hover:text-indigo-500 py-2 border-b-1 transition-colors duration-500 ease-in-out";

export default function Sidebar() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="md:hidden sticky z-40 ">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            aria-label="Open sidebar"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
      <div className="relative z-50 md:z-auto">
        {open && (
          <button
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/30 md:hidden"
          />
        )}
        <aside
          className={[
            "fixed text-white inset-y-0 left-0 w-72 h-full p-4 bg-slate-900  shadow-lg transition-transform duration-300 md:static md:translate-x-0 md:shadow-none md:w-64 md:border-r",
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open && window.innerWidth < 768 ? "true" : "false"}
        >
          <div className="flex items-center justify-between md:hidden mb-4 ">
            <h2 className="text-base font-semibold">Prediksi ISPU</h2>
            <button
              aria-label="Close sidebar"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border px-3 py-2"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="hidden md:block">
            <h2 className="text-lg font-display font-bold">
              Prediksi ISPU
            </h2>
          </div>

          <nav className="space-y-1 mb-4">
            <NavLink to="/" className={linkBase} end>
              Home
            </NavLink>
            <NavLink to="/about" className={linkBase}>
              About
            </NavLink>

            {/* LOGGED IN ONLY */}
            {loggedIn && (
              <>
                <div className="mt-4 text-xs font-medium uppercase text-gray-400">
                  Model
                </div>
                <NavLink to="/upload" className={linkBase}>
                  Upload
                </NavLink>
                <NavLink to="/model" className={linkBase}>
                  Model
                </NavLink>
                <NavLink to="/home" className={linkBase}>
                  Prediksi
                </NavLink>
              </>
            )}
          </nav>

          <div className="pt-2">
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-white px-3 py-2 text-black hover:bg-blue-400"
              >
                Logout
              </button>
            ) : (
              <NavLink to="/login" className="block">
                <span className="w-full inline-block rounded-xl bg-blue-600 px-3 py-2 text-white text-center hover:bg-blue-700">
                  Admin Login
                </span>
              </NavLink>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
