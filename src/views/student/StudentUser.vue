<template>
  <el-container>
    <el-main>
      <el-row>
        <el-col :span="24">
          <el-card class="section-card">
            <h2>学生信息</h2>
            <el-form :model="studentForm" :rules="rules" ref="studentFormRef" label-width="120px">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-form-item label="学号" prop="numid">
                    <el-input v-model="studentForm.numid" />
                  </el-form-item>
                </el-col>
                <!-- <el-col :span="6">
                  <el-form-item label="用户 ID" prop="usrId">
                    <el-input v-model.number="studentForm.usrId" type="number" />
                  </el-form-item>
                </el-col> -->
                <el-col :span="6">
                  <el-form-item label="姓名" prop="name">
                    <el-input v-model="studentForm.name" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="性别" prop="gender">
                    <el-select v-model="studentForm.gender" placeholder="请选择性别">
                      <el-option label="男" value="男" />
                      <el-option label="女" value="女" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="民族" prop="nationality">
                    <el-select v-model="studentForm.nationality" placeholder="请选择民族">
                      <el-option label="汉族" value="汉族" />
                      <el-option label="蒙古族" value="蒙古族" />
                      <el-option label="回族" value="回族" />
                      <el-option label="藏族" value="藏族" />
                      <el-option label="维吾尔族" value="维吾尔族" />
                      <el-option label="苗族" value="苗族" />
                      <el-option label="彝族" value="彝族" />
                      <el-option label="壮族" value="壮族" />
                      <el-option label="布依族" value="布依族" />
                      <el-option label="朝鲜族" value="朝鲜族" />
                      <el-option label="满族" value="满族" />
                      <el-option label="侗族" value="侗族" />
                      <el-option label="瑶族" value="瑶族" />
                      <el-option label="白族" value="白族" />
                      <el-option label="土家族" value="土家族" />
                      <el-option label="哈尼族" value="哈尼族" />
                      <el-option label="哈萨克族" value="哈萨克族" />
                      <el-option label="傣族" value="傣族" />
                      <el-option label="黎族" value="黎族" />
                      <el-option label="傈僳族" value="傈僳族" />
                      <el-option label="佤族" value="佤族" />
                      <el-option label="畲族" value="畲族" />
                      <el-option label="高山族" value="高山族" />
                      <el-option label="拉祜族" value="拉祜族" />
                      <el-option label="水族" value="水族" />
                      <el-option label="东乡族" value="东乡族" />
                      <el-option label="纳西族" value="纳西族" />
                      <el-option label="景颇族" value="景颇族" />
                      <el-option label="柯尔克孜族" value="柯尔克孜族" />
                      <el-option label="土族" value="土族" />
                      <el-option label="达斡尔族" value="达斡尔族" />
                      <el-option label="仫佬族" value="仫佬族" />
                      <el-option label="羌族" value="羌族" />
                      <el-option label="布朗族" value="布朗族" />
                      <el-option label="撒拉族" value="撒拉族" />
                      <el-option label="毛南族" value="毛南族" />
                      <el-option label="仡佬族" value="仡佬族" />
                      <el-option label="锡伯族" value="锡伯族" />
                      <el-option label="阿昌族" value="阿昌族" />
                      <el-option label="普米族" value="普米族" />
                      <el-option label="塔吉克族" value="塔吉克族" />
                      <el-option label="怒族" value="怒族" />
                      <el-option label="乌孜别克族" value="乌孜别克族" />
                      <el-option label="俄罗斯族" value="俄罗斯族" />
                      <el-option label="鄂温克族" value="鄂温克族" />
                      <el-option label="德昂族" value="德昂族" />
                      <el-option label="保安族" value="保安族" />
                      <el-option label="裕固族" value="裕固族" />
                      <el-option label="京族" value="京族" />
                      <el-option label="塔塔尔族" value="塔塔尔族" />
                      <el-option label="独龙族" value="独龙族" />
                      <el-option label="鄂伦春族" value="鄂伦春族" />
                      <el-option label="赫哲族" value="赫哲族" />
                      <el-option label="门巴族" value="门巴族" />
                      <el-option label="珞巴族" value="珞巴族" />
                      <el-option label="基诺族" value="基诺族" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-form-item label="出生日期" prop="birth">
                    <el-date-picker
                      v-model="studentForm.birth"
                      type="date"
                      placeholder="选择日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="电话" prop="phone">
                    <el-input v-model="studentForm.phone" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="邮箱" prop="email">
                    <el-input v-model="studentForm.email" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="家庭住址" prop="address">
                    <el-input v-model="studentForm.address" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <el-card class="section-card">
            <h2>学业信息</h2>
            <el-form :model="studentForm" :rules="rules" ref="studentFormRef" label-width="120px">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-form-item label="学校" prop="Universityid">
                    <el-input v-model.number="studentForm.Universityid" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="学院" prop="departid">
                    <el-input v-model.number="studentForm.departid" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="专业" prop="major">
                    <el-input v-model.number="studentForm.major" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="入学日期" prop="enrollment">
                    <el-date-picker
                      v-model="studentForm.enrollment"
                      type="date"
                      placeholder="选择日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
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
            <h2>加入班级</h2>
            <el-form :model="joinForm" ref="joinFormRef" label-width="120px">
              <el-form-item label="班级 ID" prop="teacherId">
                <el-input v-model="joinForm.teacherId"></el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="joinClass" :loading="joinClassLoading">
                  加入班级
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <!-- 2025-12-02 批量导入学生信息（前端解析 Excel + 调后端已有接口）
           2025-12-05：批量导入入口已迁移至教师端（TeacherTest.vue），学生端此组件暂时注释保留备查。
      <el-row>
        <el-col :span="24">
          <el-card class="section1-card">
            <h2>批量导入学生信息（Excel）</h2>
            <el-space>
              <el-button type="success" @click="onClickImport" :loading="importLoading">
                选择 Excel 并导入
              </el-button>
              <span style="color: #999; font-size: 13px">
                模板列头建议：学号、姓名、性别、民族、出生日期、电话、邮箱、家庭住址、学校、学院、专业、入学日期、班级
              </span>
            </el-space>
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleFileChange"
            />
          </el-card>
        </el-col>
      </el-row>
      -->
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import {
  userUpdateInfoService,
  studentSendTeacherId,
  // 2025-12-02 批量导入：复用现有注册接口创建 Users 记录
  userRegisterService,
  // 2025-12-02 批量导入：调用后端新接口写入 / 查询 student_bulk
  bulkStudentImport,
  getBulkStudentInfo,
} from '@/api/user.js'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { v4 as uuidv4 } from 'uuid' // For generating unique IDs (optional, install via npm)
import { useRouter } from 'vue-router'
// 2025-12-02 批量导入：前端解析 Excel
import * as XLSX from 'xlsx'

const router = useRouter()

// Loading states for async operations
const saveLoading = ref(false)
const joinClassLoading = ref(false)

// 2025-12-02 批量导入：导入相关状态
const importLoading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Form data
const studentForm = reactive({
  numid: '',
  // usrId: 0,
  name: '',
  gender: '',
  birth: '',
  phone: '',
  email: '',
  address: '',
  Universityid: '',
  departid: '',
  enrollment: '',
  nationality: '',
  major: '',
})

// Join class form data
const joinForm = reactive({
  teacherId: '',
})

// Form references
const studentFormRef = ref()
const joinFormRef = ref()

// Form validation rules
const rules = {
  numid: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9]{6,12}$/,
      message: '学号必须为6-12位字母或数字',
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
  nationality: [{ required: true, message: '请选择性别', trigger: 'change' }],
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
    { required: true, message: '请输入学校信息', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
  ],
  departid: [
    { required: true, message: '请输入学院信息', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
  ],
  major: [
    { required: true, message: '请输入专业信息', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
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

// Save student information to localStorage
const saveInfo = async () => {
  // 解锁其他界面
  localStorage.setItem('studentInfoCompleted', 'true')
  localStorage.removeItem('role')
  const username = localStorage.getItem('username')
  try {
    saveLoading.value = true
    await studentFormRef.value.validate(async (valid: boolean) => {
      if (valid) {
        try {
          await ElMessageBox.confirm('确定要保存学生信息吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          })

          // 1. 保存到 localStorage
          localStorage.setItem('studentInfo', JSON.stringify(studentForm))

          // 2. 同步到服务器
          await userUpdateInfoService({ studentForm, username })

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
    studentFormRef.value.resetFields()
    joinFormRef.value.resetFields()
    ElMessage.info('操作已取消')
    await fetchInitialData()
  } catch (error) {
    // User cancelled the confirmation
  }
}


// Join class (simulate locally)
const joinClass = async () => {
  try {
    joinClassLoading.value = true

    if (!joinForm.teacherId) {
      ElMessage.warning('请输入教师 ID')
      return
    }

    // 发送教师 ID 到服务器
    const response = await studentSendTeacherId({ teacherId: joinForm.teacherId })

    // 假设返回的数据是 { success: true }
    if (response.data.success) {
      ElMessage.success(`成功加入班级，教师 ID: ${joinForm.teacherId}`)
    } else {
      ElMessage.error('加入班级失败: ' + response.data.message)
    }

    // 清空教师 ID 和重置表单
    joinForm.teacherId = ''
    joinFormRef.value.resetFields()
  } catch (error) {
    console.error('Join class error:', error)
    ElMessage.error('加入班级失败: ' + (error.message || '无法更新服务器'))
  } finally {
    joinClassLoading.value = false
  }
}

// 2025-12-02 批量导入：点击按钮触发隐藏的文件选择框
const onClickImport = () => {
  if (importLoading.value) return
  fileInputRef.value?.click()
}

// 2025-12-02 批量导入：处理选择的 Excel 文件
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files && target.files[0]
  if (!file) return

  importLoading.value = true

  // 读取文件为 ArrayBuffer，交给 xlsx 解析
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = e.target?.result
      if (!data) {
        ElMessage.error('文件读取失败')
        return
      }

      // 解析工作簿（只取第一张表）
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        ElMessage.error('未在 Excel 中找到有效工作表')
        return
      }

      // 以二维数组形式读取，第一行为表头
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      if (!rows.length) {
        ElMessage.warning('Excel 内容为空')
        return
      }

      const header = rows[0] as (string | null | undefined)[]

      // 根据中文表头定位列索引（允许用户列顺序调整）
      const colIndex = {
        numid: header.indexOf('学号'),
        name: header.indexOf('姓名'),
        gender: header.indexOf('性别'),
        nationality: header.indexOf('民族'),
        age: header.indexOf('年龄'), // 2025-12-05 新增：年龄列
        birth: header.indexOf('出生日期'),
        phone: header.indexOf('电话'),
        email: header.indexOf('邮箱'),
        address: header.indexOf('家庭住址'),
        university: header.indexOf('学校'),
        depart: header.indexOf('学院'),
        major: header.indexOf('专业'),
        enrollment: header.indexOf('入学日期'),
        class_name: header.indexOf('班级'), // 2025-12-05 新增：班级列
      }

      if (colIndex.numid === -1 || colIndex.name === -1) {
        ElMessage.error('表头中至少需要包含【学号】和【姓名】列')
        return
      }

      // 2025-12-02 批量导入（改版）：先把 Excel 行解析成数组，统一调用后端批量接口
      const studentsForBulk: any[] = []
      let successCount = 0
      const errors: string[] = []

      // 从第二行开始逐行处理
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        // 跳过整行为空的情况
        if (!row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
          continue
        }

        const rowNum = i + 1 // Excel 行号（从 1 开始，包含表头）

        const numid = colIndex.numid >= 0 ? row[colIndex.numid] : ''
        const name = colIndex.name >= 0 ? row[colIndex.name] : ''

        if (!numid || !name) {
          errors.push(`第 ${rowNum} 行：学号或姓名为空，已跳过`)
          continue
        }

        const username = String(numid).trim()

        try {
          // 1）先尝试注册用户（使用学号作为用户名，统一初始密码 123456）
          try {
            await userRegisterService({
              username,
              password: '123456',
              repassword: '123456',
              role: 'student',
            })
          } catch (e: any) {
            // 如果是“用户名已存在”之类的错误，忽略，继续后续信息处理
            const msg: string = e?.response?.data?.error || e?.message || ''
            if (msg && !msg.includes('已存在') && !msg.toLowerCase().includes('exist')) {
              errors.push(`第 ${rowNum} 行：注册失败 - ${msg}`)
              continue
            }
          }

          // 2）组装学生信息，暂存到数组，后面统一调用 bulk-import 接口
          const studentPayload: any = {
            numid: username,
            name: String(name).trim(),
            gender: colIndex.gender >= 0 ? String(row[colIndex.gender] || '').trim() : '',
            nationality: colIndex.nationality >= 0 ? String(row[colIndex.nationality] || '').trim() : '',
            age: colIndex.age >= 0 ? String(row[colIndex.age] || '').trim() : '',
            birth: colIndex.birth >= 0 ? String(row[colIndex.birth] || '').trim() : '',
            phone: colIndex.phone >= 0 ? String(row[colIndex.phone] || '').trim() : '',
            email: colIndex.email >= 0 ? String(row[colIndex.email] || '').trim() : '',
            address: colIndex.address >= 0 ? String(row[colIndex.address] || '').trim() : '',
            Universityid: colIndex.university >= 0 ? String(row[colIndex.university] || '').trim() : '',
            departid: colIndex.depart >= 0 ? String(row[colIndex.depart] || '').trim() : '',
            major: colIndex.major >= 0 ? String(row[colIndex.major] || '').trim() : '',
            enrollment: colIndex.enrollment >= 0 ? String(row[colIndex.enrollment] || '').trim() : '',
            // 2025-12-05 批量导入：班级（Excel 中“班级”列）
            class_name: colIndex.class_name >= 0 ? String(row[colIndex.class_name] || '').trim() : '',
          }

          // 为了兼容后端 BulkStudentImportView，这里转换一下字段名
          studentsForBulk.push({
            username: studentPayload.numid,
            name: studentPayload.name,
            gender: studentPayload.gender,
            nationality: studentPayload.nationality,
            age: studentPayload.age,
            birth: studentPayload.birth,
            phone: studentPayload.phone,
            email: studentPayload.email,
            address: studentPayload.address,
            university: studentPayload.Universityid,
            depart: studentPayload.departid,
            major: studentPayload.major,
            enrollment: studentPayload.enrollment,
            class_name: studentPayload.class_name,
          })

          successCount++
        } catch (e: any) {
          const msg: string = e?.response?.data?.error || e?.message || '未知错误'
          errors.push(`第 ${rowNum} 行：处理行数据失败 - ${msg}`)
        }
      }

      // 3）统一调用后端批量导入接口，写入 student_bulk 表
      if (studentsForBulk.length === 0) {
        ElMessage.warning('没有可导入的数据行')
      } else {
        try {
          const res = await bulkStudentImport(studentsForBulk)
          const serverSuccess = res.data?.success_count ?? 0
          const serverFailed = res.data?.failed_count ?? 0
          const serverErrors: string[] = res.data?.errors || []

          ElMessage.success(
            `导入完成，本地解析成功 ${successCount} 条，后端写入成功 ${serverSuccess} 条，后端失败 ${serverFailed} 条`,
          )

          if (errors.length || serverErrors.length) {
            console.error('批量导入错误明细（前端解析 + 后端写入）：', [...errors, ...serverErrors])
          }
        } catch (e: any) {
          console.error('调用批量导入接口失败：', e)
          ElMessage.error('调用批量导入接口失败：' + (e?.message || '未知错误'))
        }
      }
    } catch (err: any) {
      console.error('Excel 解析或导入失败：', err)
      ElMessage.error('Excel 导入失败：' + (err?.message || '未知错误'))
    } finally {
      importLoading.value = false
      // 重置 input 的值，避免同一个文件无法二次选择
      if (target) {
        target.value = ''
      }
    }
  }

  reader.readAsArrayBuffer(file)
}

// Fetch initial data from localStorage
// const fetchInitialData = async () => {
//   const username = localStorage.getItem('username')
//   if (!username) {
//     ElMessage.error('未找到用户名，请重新登录')
//     return
//   }

//   try {
//     const response = await getStudentInfoByUsername(username)
//     if (response && response.data) {
//       Object.assign(studentForm, {
//         ...response.data,
//         birth: response.data.birth || '',
//         enrollment: response.data.enrollment || '',
//         usrId: response.data.usrId || 0,
//         Universityid: response.data.Universityid || 0,
//         departid: response.data.departid || 0,
//         classid: response.data.classid || 0,
//       })
//       localStorage.setItem('studentInfo', JSON.stringify(studentForm))
//       ElMessage.success('学生信息已加载')
//     } else {
//       throw new Error('接口未返回有效数据')
//     }
//   } catch (error) {
//     console.warn('获取学生信息失败:', error)
//     ElMessage.error('获取学生信息失败，请稍后再试')
//   }
// }

// Fetch initial data from database（已改为查询新表 student_bulk）
const fetchInitialData = async () => {
  const username = localStorage.getItem('username')
  console.log(username)
  if (!username) {
    ElMessage.error('未找到用户名，请重新登录')
    return
  }

  try {
    // 2025-12-02：改为从 student_bulk 获取导入的学生信息
    const response = await getBulkStudentInfo(username)
    if (response && response.data && Object.keys(response.data).length > 0) {
      // 只映射studentForm中存在的字段
      Object.assign(studentForm, {
        numid: response.data.username || '',
        name: response.data.name || '',
        gender: response.data.gender || '',
        birth: response.data.birth || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        address: response.data.address || '',
        Universityid: response.data.university || '',
        departid: response.data.depart || '',
        enrollment: response.data.enrollment || '',
            // 2025-12-02：student_bulk 新增民族字段
        nationality: response.data.nationality || '',
        major: response.data.major || '',
      })

      localStorage.setItem('studentInfo', JSON.stringify(studentForm))
      ElMessage.success('学生信息已加载')
    }
  } catch (error) {
    console.warn('获取学生信息失败:', error)
    ElMessage.error('获取学生信息失败，请稍后再试')
  }
}

const handleSaveInfo = async () => {
  // await saveStudentInfoApi(formData) // 发送保存请求

  // 标记信息已完善
  localStorage.setItem('is_info_completed', 'true')
  ElMessage.success('信息保存成功，功能已解锁！')

  // 返回正常学生主界面
  router.push('/student')
}

// Initialize data on mount
onMounted(() => {
  fetchInitialData()
})
</script>

<style scoped>
/* 移除必填项红色星号 */
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
