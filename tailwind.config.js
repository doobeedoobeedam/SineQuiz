module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17121f',
        film: '#0b0810',
        cream: '#f3ead8',
        pink: '#ff7ad9',
        volt: '#5b6cff',
        ok: '#3ddc97',
        bad: '#ff5d6c',
      },
      fontFamily: {
        sans: ['var(--f-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--f-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
