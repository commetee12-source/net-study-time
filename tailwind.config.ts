import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["Manrope", "system-ui", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        stai: {
          bg: "#0b1326",
          primary: "#4be277",
          "primary-dark": "#22c55e",
          gold: "#ffba61",
          surface: {
            lowest: "#060e20",
            low: "#131b2e",
            DEFAULT: "#171f33",
            high: "#222a3d",
            highest: "#2d3449",
          },
          text: {
            DEFAULT: "#dae2fd",
            variant: "#bccbb9",
          },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
