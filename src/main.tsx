import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force rebuild to fix bundle corruption
createRoot(document.getElementById("root")!).render(<App />);
