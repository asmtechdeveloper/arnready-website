import type { Config } from 'tailwindcss';
import { colors, radii, maxWidth } from './src/styles/tokens';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        purple: { DEFAULT: colors.purple, dark: colors.purpleDark, soft: colors.purpleSoft },
        green: { DEFAULT: colors.green, soft: colors.greenSoft },
        bg: colors.bg,
        amber: colors.amber,
        red: colors.red,
        ink: colors.ink,
        muted: colors.muted,
        line: colors.line,
      },
      borderRadius: {
        card: radii.card,
        pill: radii.pill,
        control: radii.control,
      },
      maxWidth: {
        content: maxWidth.content,
        reading: maxWidth.reading,
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(26, 26, 46, 0.07)',
      },
    },
  },
  plugins: [],
};

export default config;
