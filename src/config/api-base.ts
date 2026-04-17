const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!fromEnv || !fromEnv.trim()) {
    throw new Error("VITE_API_BASE_URL is not defined. Add it to your .env file before running the app.");
}

export const BASE_URL = 
fromEnv.trim().replace(/\/$/, "");  // removes the trailing “/” if it exists

export default  BASE_URL;
