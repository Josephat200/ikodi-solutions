import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl
	? configuredApiUrl
	: import.meta.env.DEV
		? "http://localhost:3001"
		: (() => {
			throw new Error("VITE_API_URL must be set in production builds");
		  })();

setBaseUrl(apiBaseUrl);

createRoot(document.getElementById("root")!).render(<App />);
