import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import PanelMenu from 'primevue/panelmenu'
import Menu from 'primevue/menu'

// 导入PrimeVue样式
// 注意：在PrimeVue 4.x版本中，样式文件路径已更改
// 不再需要导入primevue.min.css，因为主题包已包含所需样式
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
  },
})

// 全局注册PrimeVue组件
app.component('PanelMenu', PanelMenu)
app.component('PrimeMenu', Menu)

app.mount('#app')
