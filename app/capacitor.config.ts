import type { CapacitorConfig } from '@capacitor/cli'

// App Android: o mesmo build do PWA (dist/) dentro de um WebView.
const config: CapacitorConfig = {
  appId: 'br.meumei.app',
  appName: 'Meu MEI',
  webDir: 'dist',
  android: { allowMixedContent: false },
}

export default config
