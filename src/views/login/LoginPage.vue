<script setup>
import { userRegisterService, userLoginService } from '@/api/user.js'
import { User, Lock } from '@element-plus/icons-vue'
import { ref, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores'
import { useRouter } from 'vue-router'
import SetupTOTP from '@/components/SetupTOTP.vue'
import VerifyTOTP from '@/components/VerifyTOTP.vue'
import axios from 'axios'
import { baseURL, getDeviceId } from '@/utils/request'
import { setAccess, setRefresh, getAccess } from '@/utils/token'

//这样写每次登录都会重置为false
localStorage.setItem('studentInfoCompleted', 'false') //登录后判断是否完善信息
localStorage.setItem('role', '') //登录后判断是否完善信息
const studentInfoCompleted = localStorage.getItem('studentInfoCompleted') === 'true'
console.log(111)
console.log(studentInfoCompleted)

const isRegister = ref(false)
// const heartbeatAlerted = ref(false)
const form = ref()
const setupTOTPRef = ref(null)
const verifyTOTPRef = ref(null)
const setupTOTPDialogVisible = ref(false) // 控制 SetupTOTP 弹窗
const verifyTOTPDialogVisible = ref(false) // 控制 VerifyTOTP 弹窗
const qrCodeUrl = ref(null) // 存储二维码 URL
const totpCode = ref('') // 存储验证码
const tempToken = ref(null) // 存储临时 Token

const router = useRouter()

/*
// 进入登录页时，如果没有 token，确保清理遗留的心跳定时器
if (!getAccess() && window.__heartbeatTimer) {
  clearInterval(window.__heartbeatTimer)
  delete window.__heartbeatTimer
}

const startHeartbeat = () => {
  if (window.__heartbeatTimer) {
    clearInterval(window.__heartbeatTimer)
  }
  if (!getAccess()) return
  heartbeatAlerted.value = false
  window.__heartbeatTimer = setInterval(async () => {
    try {
      if (!getAccess()) {
        throw new Error('missing token')
      }
      await heartbeat()
    } catch (e) {
      clearInterval(window.__heartbeatTimer)
      delete window.__heartbeatTimer
      if (!heartbeatAlerted.value && typeof ElMessage !== 'undefined') {
        heartbeatAlerted.value = true
        ElMessage.warning('登录已失效，请重新登录')
      }
      router.push('/login')
    }
  }, 0.1 * 60 * 1000)
}
*/

const formModel = ref({
  username: '',
  password: '',
  repassword: '',
  role: '', // Add role field
})

const rules = {
  username: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是 6-15位 的非空字符',
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是 6-15位 的非空字符',
      trigger: 'blur',
    },
  ],
  repassword: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是 6-15位 的非空字符',
      trigger: 'blur',
    },
    {
      validator: (rule, value, callback) => {
        if (value !== formModel.value.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const register = async () => {
  try {
    await form.value.validate()
    const res = await userRegisterService(formModel.value)
    console.log('注册响应:', res.data) // 保留调试信息

    if (res.data.error) {
      ElMessage.error(res.data.error)
    } else {
      ElMessage.success('注册成功')
      isRegister.value = false
    }
  } catch (error) {
    const msg = error?.response?.data?.error || error?.message || '注册失败，请稍后重试'
    ElMessage.error(msg)
  }
}

const login = async () => {
  try {
    await form.value.validate()
    console.log('登录请求:', formModel.value)

    const response = await userLoginService(formModel.value)
    localStorage.setItem('username', formModel.value.username)
    console.log('登录响应:', formModel.value.username) // 添加这行来调试

    //totp绑定页面

    // TOTP 设置流程
    if (response.status === 202 && response.data.action === 'setup_totp') {
      console.log('需要 TOTP 设置，临时 Token:', response.data.temp_token)
      tempToken.value = response.data.temp_token
      await nextTick()
      if (setupTOTPRef.value) {
        console.log('SetupTOTP 组件已初始化')
        await setupTOTPRef.value.loadQRCode(response.data.temp_token)
        // qrCodeUrl.value = setupTOTPRef.value.qrCodeUrl;
        console.log('SetupTOTP 二维码加载成功')
        setupTOTPDialogVisible.value = true
        console.log('SetupTOTP 弹窗元素:', document.querySelector('.el-dialog'))
        await nextTick()
        console.log('SetupTOTP 弹窗元素:', document.querySelector('.el-dialog'))
      } else {
        console.error('SetupTOTP 组件未初始化')
      }

      return
    }

    // TOTP 验证流程
    if (response.status === 202 && response.data.action === 'verify_totp') {
      console.log('需要 TOTP 验证，临时 Token:', response.data.temp_token)
      tempToken.value = response.data.temp_token
      totpCode.value = ''
      verifyTOTPDialogVisible.value = true
      await nextTick()
      console.log('VerifyTOTP 弹窗元素:', document.querySelector('.el-dialog'))

      return
    }

    // 存储 JWT Token
    const { access, refresh } = response.data
    setAccess(access)
    setRefresh(refresh)
    // startHeartbeat()
    ElMessage.success('登录成功')

    // 确保角色值正确
    console.log('选择的角色:', formModel.value.role)
    console.log('登录成功，获取到的 JWT Token:', access)
    // 根据角色跳转
    redirectToRolePage()
    return response.data
  } catch (error) {
    const msg =
      error?.response?.data?.error || // 后端自定义 error
      error?.message ||
      '登录失败，请稍后重试'
    ElMessage.error(msg)
  }
}

// 处理TOTP设置成功
const handleSetupSuccess = () => {
  ElMessage.success('TOTP设置成功')
  setupTOTPDialogVisible.value = false
  totpCode.value = ''
  verifyTOTPDialogVisible.value = true // 自动打开验证弹窗
}

// 处理TOTP验证成功
const handleVerifySuccess = (tokens) => {
  setAccess(tokens.access)
  setRefresh(tokens.refresh)
  // startHeartbeat()
  ElMessage.success('验证成功')
  verifyTOTPDialogVisible.value = false
  redirectToRolePage()
}

// 清理TOTP状态
const handleTOTPClose = () => {
  setupTOTPDialogVisible.value = false
  verifyTOTPDialogVisible.value = false
  tempToken.value = null
  qrCodeUrl.value = null
  totpCode.value = ''
}

const submitSetup = async () => {
  if (!totpCode.value) {
    ElMessage.error('验证码不能为空')
    return
  }
  try {
    await setupTOTPRef.value.submitSetup(totpCode.value)
  } catch (error) {
    ElMessage.error('验证码无效，请重试')
    console.error(error)
  }
}

const instance = axios.create({
  baseURL: baseURL, // 明确指定后端地址
  timeout: 10000,
  headers: {
    'X-Client-Device': getDeviceId(),
  },
})

const submitVerification = async () => {
  if (!totpCode.value) {
    ElMessage.error('验证码不能为空')
    return
  }
  try {
    const response = await instance.post('/api/totp/verify/', {
      temp_token: tempToken.value,
      code: totpCode.value,
    })
    setAccess(response.data.access)
    setRefresh(response.data.refresh)
    // startHeartbeat()
    ElMessage.success('验证成功')
    verifyTOTPDialogVisible.value = false
    redirectToRolePage()
  } catch (error) {
    ElMessage.error('验证码无效，请重试')
    console.error(error)
  }

  //存储role
  localStorage.setItem('role', formModel.value.role)
  // console.log('role')
}
// 角色页面跳转
const redirectToRolePage = () => {
  // switch (formModel.value.role) {
  //   case 'student':
  //     router.push('/student')
  //     break
  //   case 'teacher':
  //     router.push('/teacher')
  //     break
  //   case 'manager':
  //     router.push('/manager')
  //     break
  //   default:
  //     router.push('/')
  //     ElMessage.warning('未识别角色，已跳转到首页')
  // }
  if (formModel.value.role === 'student') {
    if (!studentInfoCompleted) {
      router.push('/student/user') // 强制进入信息完善页
    } else {
      router.push('/student') // 正常跳转
    }
  } else if (formModel.value.role === 'teacher') {
    router.push('/teacher')
  } else if (formModel.value.role === 'manager') {
    router.push('/manager')
  }
}

// 监听注册状态
watch(isRegister, () => {
  formModel.value = {
    username: '',
    password: '',
    repassword: '',
    role: '',
  }
})
</script>

<template>
  <div class="login-container">
    <!-- 添加一个包裹容器 -->
    <!-- 使用正确的组件名和 ref -->
    <!-- 弹窗使用导入的组件 -->
    <!-- TOTP 验证弹窗 -->
    <!-- 直接使用子组件（它们自带对话框） -->
    <el-dialog
      title="设置TOTP"
      v-model="setupTOTPDialogVisible"
      width="30%"
      center
      class="custom-dialog"
      @close="handleTOTPClose"
    >
      <div v-if="qrCodeUrl" style="text-align: center; max-width: 80vw">
        <p>请使用TOTP应用程序扫描以下二维码</p>
        <img
          :src="qrCodeUrl"
          alt="TOTP二维码"
          style="width: 100%; max-width: 300px; aspect-ratio: 1/1"
        />
      </div>
      <div v-else>
        <p>正在加载二维码...</p>
      </div>
      <template #footer>
        <el-input
          v-model="totpCode"
          placeholder="请输入验证码"
          @keyup.enter="submitSetup"
          style="width: 80%; margin: 10px auto"
        ></el-input>
        <el-button type="primary" @click="submitSetup">完成设置</el-button>
      </template>
    </el-dialog>

    <el-dialog
      title="验证TOTP"
      v-model="verifyTOTPDialogVisible"
      width="30%"
      center
      class="custom-dialog"
    >
      <div style="text-align: center">
        <p>请输入TOTP应用程序生成的验证码</p>
        <el-input
          v-model="totpCode"
          placeholder="请输入验证码"
          @keyup.enter.native="submitVerification"
        ></el-input>
      </div>
      <template #footer>
        <el-button type="primary" @click="submitVerification">验证</el-button>
      </template>
    </el-dialog>
    <SetupTOTP
      ref="setupTOTPRef"
      @update:qrCodeUrl="qrCodeUrl = $event"
      @success="handleSetupSuccess"
      @close="handleTOTPClose"
    />
    <VerifyTOTP ref="verifyTOTPRef" @success="handleVerifySuccess" @close="handleTOTPClose" />

    <el-row class="login-page">
      <el-col :span="12" class="bg"></el-col>
      <el-col :span="6" :offset="3" class="form">
        <!-- 注册相关表单 -->
        <el-form
          :model="formModel"
          :rules="rules"
          ref="form"
          size="large"
          autocomplete="off"
          v-if="isRegister"
        >
          <el-form-item>
            <h1>注册</h1>
          </el-form-item>
          <el-form-item prop="username">
            <el-input
              v-model="formModel.username"
              :prefix-icon="User"
              placeholder="请输入学号"
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formModel.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入密码"
            ></el-input>
          </el-form-item>
          <el-form-item prop="repassword">
            <el-input
              v-model="formModel.repassword"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入再次密码"
            ></el-input>
          </el-form-item>
          <el-form-item prop="role">
            <el-select v-model="formModel.role" placeholder="请选择角色" style="width: 100%">
              <el-option label="学生" value="student" />
              <el-option label="教师" value="teacher" />
              <el-option label="管理员" value="manager" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="register" class="button" type="primary" auto-insert-space>
              注册
            </el-button>
          </el-form-item>
          <el-form-item class="flex">
            <el-link type="info" :underline="false" @click="isRegister = false"> ← 返回 </el-link>
          </el-form-item>
        </el-form>

        <!-- 登录相关表单 -->
        <el-form
          :model="formModel"
          :rules="rules"
          ref="form"
          size="large"
          autocomplete="off"
          v-else
        >
          <el-form-item>
            <h1>登录</h1>
          </el-form-item>
          <el-form-item prop="username">
            <el-input
              v-model="formModel.username"
              :prefix-icon="User"
              placeholder="请输入学号"
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formModel.password"
              name="password"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入密码"
            ></el-input>
          </el-form-item>
          <el-form-item prop="role">
            <el-select v-model="formModel.role" placeholder="请选择角色" style="width: 100%">
              <el-option label="学生" value="student" />
              <el-option label="教师" value="teacher" />
              <el-option label="管理员" value="manager" />
            </el-select>
          </el-form-item>
          <el-form-item class="flex">
            <div class="flex">
              <el-checkbox>记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码？</el-link>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button @click="login" class="button" type="primary" auto-insert-space
              >登录</el-button
            >
          </el-form-item>
          <el-form-item class="flex">
            <el-link type="info" :underline="false" @click="isRegister = true"> 注册 → </el-link>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  height: 100vh;
  // background: url('@/assets/login-bg.png') no-repeat center / cover;
  background-color: #fff;
  .bg {
    background:
      url('@/assets/logo3.png') no-repeat 60% center / 400px auto,
      url('@/assets/login-bg.png') no-repeat center / cover;
    border-radius: 0 20px 20px 0;
  }
  .form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    user-select: none;
    .title {
      margin: 0 auto;
    }
    .button {
      width: 100%;
    }
    .flex {
      width: 100%;
      display: flex;
      justify-content: space-between;
    }
  }
}
</style>
