/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL FIX: Tell Tailwind to scan all JavaScript/JSX/TypeScript files 
  // in the src/ directory for class names to compile.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}