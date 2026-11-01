import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#E5ECFF",
        night: "#08111f",
        mist: "#9BA9C8",
        glass: "#101b31",
        accent: "#74E0B8",
        peach: "#FFB6A0",
        blue: "#73B8FF"
      },
      boxShadow: {
        calm: "0 24px 80px rgba(5, 10, 24, 0.38)"
      },
      backgroundImage: {
        aura:
          "radial-gradient(circle at top left, rgba(116,224,184,0.16), transparent 28%), radial-gradient(circle at top right, rgba(115,184,255,0.14), transparent 24%), linear-gradient(180deg, #08111f 0%, #0d1830 48%, #08111f 100%)"
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
