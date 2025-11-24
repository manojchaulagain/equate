/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    // Make sure it looks for classes in your component files
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
