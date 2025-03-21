import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import PanelMenu from 'primevue/panelmenu'

// 导入 SQLite 客户端
import { SqliteClient } from './services/db/SqliteClient'
import { DataProviderFactory } from './services/db/DataProviderFactory'

// 导入PrimeVue样式
// 注意：在PrimeVue 4.x版本中，样式文件路径已更改
// 不再需要导入primevue.min.css，因为主题包已包含所需样式
import 'primeicons/primeicons.css'

// 创建 Pinia 存储
const pinia = createPinia()

/**
 * 初始化应用
 */
async function initApp() {
  try {
    console.log('正在初始化 SQLite 数据库...')

    // 初始化 SQLite 数据库
    await SqliteClient.getInstance().init()

    // 预加载数据提供者
    await DataProviderFactory.getInstance().getDataProvider()

    console.log('SQLite 数据库初始化成功')

    // 创建 Vue 应用
    const app = createApp(App)

    app.use(pinia)
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

    // 挂载应用
    app.mount('#app')
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
}

// 启动应用
initApp()
