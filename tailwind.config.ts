import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        // カスタム色を追加
        'brand-brown': '#887c5d',
        'brand-camel': '#C19A6B',
      },
    },
  },
}

export default config