// Tailwind v4: design tokens live in app/globals.css via @theme.
// This file is kept for plugin registration if needed in the future.
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
}

export default config
