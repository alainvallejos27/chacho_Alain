const tailwindcss = require('@tailwindcss/vite').default;

module.exports = {
  plugins: [tailwindcss()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
};
