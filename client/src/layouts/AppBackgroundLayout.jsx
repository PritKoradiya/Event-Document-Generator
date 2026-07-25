import { Outlet } from "react-router-dom";
import GalaxyBackground from "../components/background/GalaxyBackground.jsx";

function AppBackgroundLayout() {
  return (
    <div className="app-galaxy-root">
      <GalaxyBackground />
      <div className="app-content-layer">
        <Outlet />
      </div>
    </div>
  );
}

export default AppBackgroundLayout;
