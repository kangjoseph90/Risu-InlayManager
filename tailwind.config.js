/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,svelte}',
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
  important: '#inlay-manager-container',
}
