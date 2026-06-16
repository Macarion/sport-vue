<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue'
import TOTPVerificationModal from '@/components/TOTPVerificationModal.vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useSecurityStore } from '@/stores/security'
import SecurityVerificationDialog from '@/components/SecurityVerificationDialog.vue'

// 定义状态
const showTOTPModal = ref(false)
const pendingRequests = ref([])
const router = useRouter()
const securityStore = useSecurityStore()

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
  showTOTPModal.value = false
}

// 处理模态框关闭事件
const handleModalClose = () => {
  pendingRequests.value.forEach(({ reject }) => {
    reject(new Error('TOTP verification canceled'))
  })
  pendingRequests.value = []
  showTOTPModal.value = false
}

// 路由钩子，在路由切换时清空待处理请求
const cleanup = () => {
  if (pendingRequests.value.length) {
    handleModalClose()
  }
}

router.beforeEach(cleanup)
onBeforeUnmount(cleanup)

// 提供验证方法给所有子组件
provide('totpVerifier', { requestTOTPVerification })

// 在安全存储中设置验证方法
onMounted(() => {
  securityStore.setVerificationHandler(requestTOTPVerification)
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view />
    <!-- 使用同一个安全验证对话框 -->
    <SecurityVerificationDialog
      v-if="securityStore.isTotpDialogOpen"
      @close="securityStore.closeTotpDialog"
    />
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
