import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import request from '@/utils/request'

import '@/assets/main.scss'

// 导入 TOTP 对话框组件
import TOTPDialog from '@/components/TOTPDialog.vue'

const app = createApp(App)

// 创建并安装 Pinia
const pinia = createPinia()
app.use(pinia)

// 注册路由
app.use(router)

// 创建并挂载 TOTP 对话框
const totpDialog = createApp(TOTPDialog).mount(document.createElement('div'))
document.body.appendChild(totpDialog.$el)

// 将对话框引用存储到安全存储
import { useSecurityStore } from '@/stores/security'
const securityStore = useSecurityStore()
securityStore.setTotpDialogRef(totpDialog)

// 挂载应用
app.mount('#app')
