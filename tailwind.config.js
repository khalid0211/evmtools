/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#3498db',
          600: '#2980b9',
          700: '#1f6f9e',
        },
        ink: {
          900: '#2c3e50',
          700: '#34495e',
          500: '#495057',
          400: '#6c757d',
          200: '#dee2e6',
          100: '#e9ecef',
          50: '#f8f9fa',
        },
        good: '#28a745',
        warn: '#ffc107',
        danger: '#dc3545',
        info: '#007bff',
        purple: '#6f42c1',
        teal: '#17a2b8',
      },
      boxShadow: {
        card: '0 2px 4px rgba(0,0,0,0.05)',
        'card-lg': '0 4px 6px -1px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
