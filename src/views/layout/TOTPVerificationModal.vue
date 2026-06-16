<!-- components/TOTPVerificationModal.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="TOTP 验证"
    width="400px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <div class="totp-verification">
      <p>该操作需要 TOTP 验证，请输入您的验证码：</p>
      <el-input
        v-model="verificationCode"
        placeholder="请输入6位验证码"
        maxlength="6"
        @keyup.enter="verifyTOTP"
      />
      <div class="action-buttons">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="verifyTOTP">验证</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:show', 'verified'])

const visible = ref(props.show)
const verificationCode = ref('')

// 监听父组件传递的 show 属性变化
watch(() => props.show, (val) => {
  visible.value = val
})

// 监听自身 visible 状态变化
watch(visible, (val) => {
  emit('update:show', val)
})

const verifyTOTP = async () => {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    ElMessage.warning('请输入6位验证码')
    return
  }

  try {
    const response = await axios.post('/api/verify-totp/', {
      code: verificationCode.value
    })

    if (response.data.success) {
      ElMessage.success('验证成功')
      visible.value = false
      emit('verified', true)
    } else {
      ElMessage.error(response.data.message || '验证失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.error || 'TOTP验证失败')
  }
}

const cancel = () => {
  visible.value = false
  emit('verified', false)
}
</script>

<style scoped>
.totp-verification {
  padding: 20px;
  text-align: center;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
