<script setup>
import { ref,provide,defineExpose } from 'vue'
import TOTPVerificationModal from '@/components/TOTPVerificationModal.vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useSecurityStore } from '@/stores/security'



// 定义状态
const showTOTPModal = ref(false)
const pendingRequests = ref([])

// 暴露方法供其他组件调用
const requestTOTPVerification = (config) => {
  return new Promise((resolve, reject) => {
    pendingRequests.value.push({ config, resolve, reject })
    showTOTPModal.value = true
  })
}

const handleTOTPVerified = (success) => {
  if (success) {
    // 重新执行所有待处理的请求
    pendingRequests.value.forEach(({ config, resolve }) => {
      axios(config)
        .then(response => resolve(response))
        .catch(error => resolve(error.response))
    })
  } else {
    // 用户取消验证，拒绝所有请求
    pendingRequests.value.forEach(({ reject }) => {
      reject(new Error('TOTP verification canceled'))
    })
  }

  // 清空待处理请求
  pendingRequests.value = []
}

// 处理模态框关闭事件
const handleModalClose = () => {
  pendingRequests.value.forEach(({ reject }) => {
    reject(new Error('TOTP verification canceled'))
  })
  pendingRequests.value = []
}

// 路由钩子，在路由切换时清空待处理请求
const router = useRouter()

const cleanup = () => {
  if (pendingRequests.value.length) {
    handleModalClose()
  }
}

router.beforeEach(cleanup)
onBeforeUnmount(cleanup)

// 暴露到全局，使所有组件都能访问
defineExpose({ requestTOTPVerification })
provide('totpVerifier', { requestTOTPVerification })


</script>

<template>
  <!-- App.vue只需要留一个路由出口 router-view即可 -->
<el-config-provider :locale="zhCn">
  <router-view />
  <TOTPVerificationModal
    v-model:show="showTOTPModal"
    @verified="handleTOTPVerified"
    @close="handleModalClose"
  />
  <SecurityVerificationDialog />
</el-config-provider>
</template>

<!-- <style scoped></style> -->
<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}
</style>
