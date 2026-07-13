/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E0E13",
        panel: "#17171F",
        paper: "#F4F1E9",
        sakura: "#FF5C8A",
        denki: "#4D7CFF",
        muted: "#8B8A97",
      },
      fontFamily: {
        display: ["'Bebas Neue'", "Impact", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        halftone:
          "radial-gradient(circle, rgba(255,92,138,0.18) 1px, transparent 1px)",
      },
      backgroundSize: {
        dots: "10px 10px",
      },
    },
  },
  plugins: [],
};
