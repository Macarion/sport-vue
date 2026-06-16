<template>
  <el-container>
    <el-main>
      <el-row>
        <el-col :span="24">
          <el-card class="section-card">
            <h2>教师信息</h2>
            <el-form :model="teacherForm" :rules="rules" ref="studentFormRef" label-width="120px">
              <el-form-item label="工号" prop="numid">
                <el-input v-model="teacherForm.numid"></el-input>
              </el-form-item>
              <el-form-item label="用户 ID" prop="usrId">
                <el-input v-model.number="teacherForm.usrId" type="number"></el-input>
              </el-form-item>
              <el-form-item label="姓名" prop="name">
                <el-input v-model="teacherForm.name"></el-input>
              </el-form-item>
              <el-form-item label="性别" prop="gender">
                <el-select v-model="teacherForm.gender" placeholder="请选择性别">
                  <el-option label="男" value="男"></el-option>
                  <el-option label="女" value="女"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="出生日期" prop="birth">
                <el-date-picker
                  v-model="teacherForm.birth"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                ></el-date-picker>
              </el-form-item>
              <el-form-item label="电话" prop="phone">
                <el-input v-model="teacherForm.phone"></el-input>
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="teacherForm.email"></el-input>
              </el-form-item>
              <el-form-item label="家庭住址" prop="address">
                <el-input v-model="teacherForm.address"></el-input>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <el-card class="section-card">
            <h2>教师信息</h2>
            <el-form :model="teacherForm" :rules="rules" ref="studentFormRef" label-width="120px">
              <el-form-item label="学校信息 ID" prop="Universityid">
                <el-input v-model.number="teacherForm.Universityid" type="number"></el-input>
              </el-form-item>
              <el-form-item label="学院信息 ID" prop="departid">
                <el-input v-model.number="teacherForm.departid" type="number"></el-input>
              </el-form-item>
              <el-form-item label="入学日期" prop="enrollment">
                <el-date-picker
                  v-model="teacherForm.enrollment"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                ></el-date-picker>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <el-row class="button-row">
        <el-col :span="24" class="button-container">
          <el-button type="primary" @click="saveInfo" :loading="saveLoading"> 保存信息 </el-button>
          <el-button @click="cancel">取消</el-button>
        </el-col>
      </el-row>

      <el-row>
        <el-col :span="24">
          <el-card class="section1-card">
            <h2>创建班级</h2>
            <el-form :model="joinForm" ref="joinFormRef" label-width="120px">
              <el-form-item label="班级 ID" prop="teacherId">
                <el-input v-model="joinForm.classId"></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="joinClass" :loading="joinClassLoading">
                  创建班级
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import {
  teacherGetInfoService,
  teacherUpdateInfoService,
  teacherSendTeacherId,
} from '@/api/user.js'
import { ref, reactive, onMounted ,getCurrentInstance} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { useSecurityStore } from '@/stores/security'

const securityStore = useSecurityStore()

// Loading states for async operations
const saveLoading = ref(false)
const joinClassLoading = ref(false)

// Form data for teacher
const teacherForm = reactive({
  numid: '',
  usrId: 0,
  name: '',
  gender: '',
  birth: '',
  phone: '',
  email: '',
  address: '',
  Universityid: 0,
  departid: 0,
  enrollment: '',
})

// Join class form data
const joinForm = reactive({
  classId: '',
})

// Form references
const teacherFormRef = ref()
const joinFormRef = ref()

// Form validation rules
const rules = {
  numid: [
    { required: true, message: '请输入工号', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9]{6,12}$/,
      message: '工号必须为6-12位字母或数字',
      trigger: 'blur',
    },
  ],
  usrId: [
    { required: true, message: '请输入用户 ID', trigger: 'blur' },
    { type: 'number', message: '用户 ID 必须为数字', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birth: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^[0-9]{11}$/, message: '电话必须为11位数字', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  address: [
    { required: true, message: '请输入家庭住址', trigger: 'blur' },
    { min: 5, max: 100, message: '地址长度为5-100个字符', trigger: 'blur' },
  ],
  Universityid: [
    { required: true, message: '请输入学校信息 ID', trigger: 'blur' },
    { type: 'number', message: '学校信息 ID 必须为数字', trigger: 'blur' },
  ],
  departid: [
    { required: true, message: '请输入学院信息 ID', trigger: 'blur' },
    { type: 'number', message: '学院信息 ID 必须为数字', trigger: 'blur' },
  ],
  enrollment: [{ required: true, message: '请选择入学日期', trigger: 'change' }],
  teacherId: [
    { required: true, message: '请输入教师 ID', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9]{6,12}$/,
      message: '教师 ID 必须为6-12位字母或数字',
      trigger: 'blur',
    },
  ],
}

// Save teacher information to localStorage
const saveInfo = async () => {
  try {
    saveLoading.value = true
    await teacherFormRef.value.validate(async (valid: boolean) => {
      if (valid) {
        try {
          await ElMessageBox.confirm('确定要保存教师信息吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          })

          // 1. 保存到 localStorage
          localStorage.setItem('teacherInfo', JSON.stringify(teacherForm))

          // 2. 同步到服务器
          await teacherUpdateInfoService({ teacherForm })

          ElMessage.success('信息保存成功')
        } catch (error) {
          console.error('Save error:', error)
          ElMessage.error('信息保存失败: ' + (error.message || '无法保存到服务器'))
        }
      } else {
        ElMessage.warning('请检查表单内容')
      }
    })
  } finally {
    saveLoading.value = false
  }
}

// Cancel operation
const cancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消操作吗？未保存的更改将丢失。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    teacherFormRef.value.resetFields()
    joinFormRef.value.resetFields()
    ElMessage.info('操作已取消')
    await fetchInitialData()
  } catch (error) {
    // User cancelled the confirmation
  }
}


// const joinClass = async () => {
//   try {
//     // 1. 首先尝试直接调用API
//     const response = await teacherSendTeacherId({ classId: joinForm.classId })
//     console.log('加入班级成功:', response.data)
//   } catch (error) {
//     // 2. 检查是否需要TOTP验证
//     if (error.response?.status === 403 && error.response.data?.code === 'require_totp') {
//       try {
//         console.log('需要TOTP验证，触发验证流程...')

//         // 3. 通过安全存储请求验证
//         const verifiedResponse = await securityStore.requestVerification({
//           method: 'post',
//           url: '/api/teacher/user/', // 确保与API路径匹配
//           data: { classId: joinForm.classId }
//         })

//         console.log('验证后加入班级成功:', verifiedResponse.data)
//       } catch (verificationError) {
//         console.error('验证流程失败:', verificationError)
//         alert(`验证流程失败: ${verificationError.message}`)
//       }
//     } else {
//       console.error('其他错误:', error)
//       alert(`加入班级失败: ${error.response?.data?.message || error.message}`)
//     }
//   }
// }
import axios from 'axios'

const joinClass = async () => {
  try {
    joinClassLoading.value = true;

    // 使用api实例发送请求
    // const response = await request.post('/api/teacher/user/', {
    //   classId: joinForm.classId
    // });
    const response = await teacherSendTeacherId({ classId: joinForm.classId })
    console.log('创建班级成功:', response.data);
    ElMessage.success('班级创建成功');

    // 可选：重置表单
    joinForm.classId = '';
  } catch (error) {
    console.error('创建班级失败:', error);

    // 特殊处理TOTP验证取消的情况
    if (error.message === 'TOTP verification canceled') {
      ElMessage.info('操作已取消');
    } else if (error.response?.data?.code === 'invalid_totp') {
      ElMessage.error('验证码无效，请重试');
    } else if (error.response?.data?.code === 'totp_verified') {
      ElMessage.success('验证码验证成功');
      // 可选：根据需要执行其他操作，例如重置表单或刷新数据
      joinForm.classId = '';
    } else {
      ElMessage.error(`创建班级失败: ${error.response?.data?.message || error.message}`);
    }
  } finally {
    joinClassLoading.value = false;
  }
};

// Fetch initial data from localStorage
const fetchInitialData = async () => {
  try {
    const storedData = localStorage.getItem('teacherInfo')
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      Object.assign(teacherForm, {
        ...parsedData,
        birth: parsedData.birth || '',
        enrollment: parsedData.enrollment || '',
        usrId: parsedData.usrId || 0,
        Universityid: parsedData.Universityid || 0,
        departid: parsedData.departid || 0,
      })
      ElMessage.success('本地数据加载成功')
    } else {
      ElMessage.warning('未找到本地教师信息')
    }
  } catch (error) {
    console.error('Fetch initial data error:', error)
    ElMessage.error('获取本地数据失败: ' + (error.message || '无法读取本地存储'))
  }
}

// Initialize data on mount
onMounted(() => {
  const app = getCurrentInstance()
  app.appContext.config.globalProperties.$axios = request
  fetchInitialData()
})
</script>

<style scoped>
:deep(.el-form-item.is-required .el-form-item__label::before) {
  content: none !important;
}

.el-header {
  background-color: #409eff;
  color: white;
  text-align: center;
  line-height: 60px;
}
.el-main {
  padding: 20px;
}
.section-card {
  margin-bottom: 20px;
}
h2 {
  margin-bottom: 20px;
}
.button-row {
  margin-top: 20px;
  text-align: center;
}
.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.section1-card {
  margin-top: 30px;
  margin-bottom: 20px;
}
</style>
