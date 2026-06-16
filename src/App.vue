<script setup>
// import { onMounted } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// import { heartbeat } from '@/api/user'
// import { getAccess } from '@/utils/token'
// import router from '@/router'

/*
// 在应用初始化时，如已存在 token，则启动心跳
onMounted(() => {
  if (getAccess()) {
    // 复用登录页的心跳逻辑：存在 token 且当前无定时器时启动
    if (!window.__heartbeatTimer) {
      window.__heartbeatTimer = setInterval(async () => {
        try {
          if (!getAccess()) {
            throw new Error('missing token')
          }
          await heartbeat()
        } catch (e) {
          if (window.__heartbeatTimer) {
            clearInterval(window.__heartbeatTimer)
            delete window.__heartbeatTimer
          }
          if (typeof ElMessage !== 'undefined') {
            ElMessage.warning('登录已失效，请重新登录')
          }
          router.push('/login')
        }
      }, 0.1 * 60 * 1000)
    }
  }
})
*/
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}
</style>
