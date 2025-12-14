import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  return (
    <div className="container mx-auto min-h-screen">
      <div className="mx-auto h-screen flex-row md:flex">
        <Sidebar />
        <main className="p-4 w-full overflow-y-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
