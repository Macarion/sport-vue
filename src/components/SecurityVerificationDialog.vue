<!-- src/components/SecurityVerificationDialog.vue -->
<!-- <template>
  <div v-if="isOpen" class="security-overlay">
    <div class="security-dialog">
      <div class="dialog-header">
        <h2>安全验证</h2>
        <p>为了您的账户安全，请完成验证</p>
      </div>

      <div class="dialog-content">
        <div class="totp-input-group">
          <div class="totp-inputs">
            <input
              v-for="i in 6"
              :key="i"
              v-model="code[i-1]"
              type="text"
              maxlength="1"
              :class="{ 'error': errorMessage }"
              @input="handleInput(i, $event)"
              @keydown.delete="handleBackspace(i, $event)"
              @keydown="handleNavigation($event, i)"
              ref="inputs"
            />
          </div>
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>

        <div class="timer">
          <p>验证码有效期: <span :class="{ 'warning': timeLeft <= 10 }">{{ formattedTime }}</span></p>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeDialog">取消</button>
        <button
          class="verify-btn"
          :disabled="isVerifying || !isCodeComplete"
          @click="submitVerification"
        >
          <span v-if="isVerifying">验证中...</span>
          <span v-else>验证</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useSecurityStore } from '@/stores/security';

const securityStore = useSecurityStore();
const inputs = ref([]);

// 响应式处理验证码输入
const code = ref(Array(6).fill(''));
const timer = ref(null);
const timeLeft = ref(120); // 2分钟有效期

const isOpen = computed(() => securityStore.isTotpDialogOpen);
const isVerifying = computed(() => securityStore.isVerifying);
const errorMessage = computed(() => securityStore.errorMessage);
const isCodeComplete = computed(() => code.value.join('').length === 6);

// 格式化剩余时间
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// 处理输入
const handleInput = (index, event) => {
  const value = event.target.value;

  if (value && index < 6) {
    inputs.value[index].focus();
  }

  securityStore.setErrorMessage('');
};

// 处理退格键
const handleBackspace = (index, event) => {
  if (!code.value[index - 1] && index > 1) {
    inputs.value[index - 2].focus();
  }
};

// 处理导航键（左右箭头）
const handleNavigation = (event, index) => {
  if (event.key === 'ArrowLeft' && index > 1) {
    event.preventDefault();
    inputs.value[index - 2].focus();
  } else if (event.key === 'ArrowRight' && index < 6) {
    event.preventDefault();
    inputs.value[index].focus();
  }
};

// 提交验证
const submitVerification = async () => {
  const fullCode = code.value.join('')
  securityStore.setTotpCode(fullCode)

  try {
    // 调用 store 的 resolveRequests 方法重新发送请求
    await securityStore.resolveRequests()
  } catch (error) {
    if (error.response?.data?.code === 'invalid_totp') {
      securityStore.setErrorMessage('验证码错误，请重新输入')
      resetCode()
    } else {
      securityStore.setErrorMessage('验证失败，请稍后再试')
    }
  }
}

// 重置验证码
const resetCode = () => {
  code.value = Array(6).fill('');
  if (inputs.value.length > 0) {
    inputs.value[0].focus();
  }
};

// 关闭对话框
const closeDialog = () => {
  securityStore.closeTotpDialog();
  resetTimer();
  resetCode();
};

// 重置计时器
const resetTimer = () => {
  clearInterval(timer.value);
  timeLeft.value = 120;
};

// 初始化计时器
const startTimer = () => {
  resetTimer();
  timer.value = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      resetTimer();
      securityStore.setErrorMessage('验证码已过期');
      resetCode();
    }
  }, 1000);
};

// 监听对话框打开状态
watch(isOpen, (newVal) => {
  if (newVal) {
    startTimer();
    // 自动聚焦到第一个输入框
    setTimeout(() => {
      if (inputs.value.length > 0) {
        inputs.value[0].focus();
      }
    }, 100);
  } else {
    resetTimer();
  }
});

onMounted(() => {
  if (isOpen.value) {
    startTimer();
  }
});
</script> -->

<template>
  <el-dialog
    v-model="securityStore.isTotpDialogOpen"
    title="安全验证"
    @close="securityStore.cancelTOTP"
  >
    <el-input
      v-model="securityStore.totpCode"
      placeholder="请输入TOTP验证码"
      @input="securityStore.setTOTPCode"
      @keyup.enter="securityStore.submitTOTP"
    />
    <template #footer>
      <el-button @click="securityStore.cancelTOTP">取消</el-button>
      <el-button type="primary" @click="securityStore.submitTOTP">验证</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useSecurityStore } from '@/stores/security';

const securityStore = useSecurityStore();
</script>

<style scoped>
.security-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.security-dialog {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  width: 400px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #3498db, #1a5276);
  color: white;
  padding: 20px;
  text-align: center;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.8rem;
}

.dialog-header p {
  margin: 8px 0 0;
  opacity: 0.9;
}

.dialog-content {
  padding: 25px;
}

.totp-input-group {
  margin-bottom: 20px;
}

.totp-inputs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
}

.totp-inputs input {
  width: 45px;
  height: 60px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1.8rem;
  text-align: center;
  transition: all 0.3s;
}

.totp-inputs input:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  outline: none;
}

.totp-inputs input.error {
  border-color: #e74c3c;
}

.error-message {
  color: #e74c3c;
  text-align: center;
  font-size: 0.9rem;
  height: 20px;
}

.timer {
  text-align: center;
  font-size: 0.95rem;
  color: #555;
}

.timer .warning {
  color: #e67e22;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  padding: 15px;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
}

.cancel-btn, .verify-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: #ecf0f1;
  color: #34495e;
  margin-right: 10px;
}

.cancel-btn:hover {
  background-color: #d5dbdb;
}

.verify-btn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.verify-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.verify-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #27ae60, #219653);
}
</style>
