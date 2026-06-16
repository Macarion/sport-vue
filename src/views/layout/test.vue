<template>
  <div class="setup-totp-page">
    <h1>设置 TOTP</h1>
    <div v-if="!totpEnabled">
      <img :src="qrCode" alt="QR Code" v-if="qrCode" />
      <p>请使用身份验证应用程序扫描二维码并输入验证码以完成设置。</p>
      <el-input v-model="verificationCode" placeholder="请输入验证码" />
      <el-button @click="verifyTOTP" type="primary">验证</el-button>
    </div>
    <div v-else>
      <p>TOTP 已经设置成功！</p>
      <p>上次验证时间: {{ lastVerified }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'

const totpEnabled = ref(false)
const lastVerified = ref(null)
const qrCode = ref('')
const verificationCode = ref('')

const setupTOTP = async () => {
  try {
    const response = await axios.post('/api/setup-totp/')
    const provisioningUri = response.data.provisioning_uri
    const qrCodeBase64 = response.data.qr_code_base64
    qrCode.value = `data:image/png;base64,${qrCodeBase64}`
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '设置TOTP失败')
  }
}

const verifyTOTP = async () => {
  try {
    const response = await axios.post('/api/verify-totp/', {
      code: verificationCode.value
    })
    ElMessage.success(response.data.message)
    totpEnabled.value = true
    lastVerified.value = response.data.last_verified
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '验证TOTP失败')
  }
}

const getTOTPStatus = async () => {
  try {
    const response = await axios.get('/api/setup-totp/')
    totpEnabled.value = response.data.totp_enabled
    lastVerified.value = response.data.last_verified
    if (!totpEnabled.value) {
      setupTOTP()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '获取TOTP状态失败')
  }
}

onMounted(() => {
  getTOTPStatus()
})
</script>

<style scoped>
/* 添加一些样式 */
.setup-totp-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f0f2f5;
}

h1 {
  margin-bottom: 20px;
}

img {
  margin-bottom: 20px;
  width: 200px;
  height: 200px;
}

.el-input {
  margin-bottom: 20px;
  width: 100%;
}

.el-button {
  margin-bottom: 20px;
  width: 100%;
}
</style>
