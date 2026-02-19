import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import sharedPreset from '@howard/ui/tailwind.preset'

const config: Config = {
  ...sharedPreset,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...sharedPreset.theme,
  },
  plugins: [tailwindcssAnimate],
}

export default config
