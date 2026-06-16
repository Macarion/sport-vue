<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
// 2025-12-05 批量导入：前端解析 Excel + 调用后端 student_bulk 接口
import * as XLSX from 'xlsx'
import {
  bulkStudentImport,
  userRegisterService,
  fetchBulkStudentList,
  getBulkStudentInfo,
  teacherUpdateBulkStudent,
  teacherDeleteBulkStudents,
} from '@/api/user.js'

const router = useRouter()

// 学生数据（2025-12-05：改为从后端 student_bulk 拉取，不再使用写死的示例数组）
const students = ref([])

// 状态变量
const searchQuery = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({
  studentId: '',
  name: '',
  gender: '',
  age: '',
  class: '',
  nationality: '',
  birth: '',
  phone: '',
  email: '',
  address: '',
  university: '',
  depart: '',
  major: '',
  enrollment: '',
})
// 2026-01-27 学生详情弹窗
const detailDialogVisible = ref(false)
const detailData = ref({})

// 2026-01-27 删除确认对话框（使用 el-dialog 风格）
const confirmDialogVisible = ref(false)
const confirmText = ref('')
const deleteMode = ref('single') // 'single' | 'batch'
const pendingDeleteIds = ref([])
const multipleSelection = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

// 2025-12-05 批量导入：导入相关状态
const importLoading = ref(false)
const fileInputRef = ref(null)

// 2025-12-05 教师端学生列表：从 student_bulk 获取数据
const loadStudents = async () => {
  try {
    const res = await fetchBulkStudentList()
    const list = res.data || []
    students.value = list.map((s) => ({
      studentId: s.studentId || s.username || '',
      name: s.name || '',
      gender: s.gender || '',
      age: s.age || '',
      class: s.class || s.class_name || '',
      // 其余详细字段在需要时通过 getBulkStudentInfo 读取
    }))
  } catch (e) {
    console.error('获取学生列表失败:', e)
    ElMessage.error('获取学生列表失败')
  }
}

// 搜索过滤
const filteredStudents = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return students.value.filter(
    (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q),
  )
})

// 新增
const openAddDialog = () => {
  form.value = {
    studentId: '',
    name: '',
    gender: '',
    age: '',
    class: '',
    nationality: '',
    birth: '',
    phone: '',
    email: '',
    address: '',
    university: '',
    depart: '',
    major: '',
    enrollment: '',
  }
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑
const openEditDialog = async (student) => {
  try {
    const res = await getBulkStudentInfo(student.studentId)
    const data = res.data || {}
    form.value = {
      studentId: data.username || student.studentId,
      name: data.name || student.name,
      gender: data.gender || student.gender,
      age: data.age ?? student.age,
      class: data.class_name || student.class,
      nationality: data.nationality || '',
      birth: data.birth || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      university: data.university || '',
      depart: data.depart || '',
      major: data.major || '',
      enrollment: data.enrollment || '',
    }
    isEdit.value = true
    dialogVisible.value = true
  } catch (e) {
    console.error('获取学生信息失败:', e)
    ElMessage.error('获取学生信息失败，无法编辑')
  }
}

// 保存学生（新增 / 编辑）
const saveStudent = async () => {
  if (!form.value.name || !form.value.studentId) {
    ElMessage.error('请填写完整信息')
    return
  }
  if (isEdit.value) {
    try {
      await teacherUpdateBulkStudent({
        studentId: form.value.studentId,
        name: form.value.name,
        gender: form.value.gender,
        age: form.value.age,
        class: form.value.class,
        nationality: form.value.nationality,
        birth: form.value.birth,
        phone: form.value.phone,
        email: form.value.email,
        address: form.value.address,
        university: form.value.university,
        depart: form.value.depart,
        major: form.value.major,
        enrollment: form.value.enrollment,
      })
      ElMessage.success('学生信息已更新')
      await loadStudents()
    } catch (e) {
      console.error('更新学生信息失败:', e)
      ElMessage.error('更新学生信息失败')
      return
    }
  } else {
    const username = String(form.value.studentId).trim()
    try {
      try {
        await userRegisterService({
          username,
          password: '123456',
          repassword: '123456',
          role: 'student',
        })
      } catch (e) {
        const msg = (e && e.response && e.response.data && e.response.data.error) || e?.message || ''
        if (msg && !msg.includes('已存在') && !msg.toLowerCase().includes('exist')) {
          throw e
        }
      }

      const payload = [
        {
          username,
          name: form.value.name,
          gender: form.value.gender || '',
          nationality: form.value.nationality || '',
          age: form.value.age || '',
          birth: form.value.birth || '',
          phone: form.value.phone || '',
          email: form.value.email || '',
          address: form.value.address || '',
          university: form.value.university || '',
          depart: form.value.depart || '',
          major: form.value.major || '',
          enrollment: form.value.enrollment || '',
          class_name: form.value.class || '',
        },
      ]
      await bulkStudentImport(payload)
      ElMessage.success('新增学生成功')
      await loadStudents()
    } catch (e) {
      console.error('新增学生失败:', e)
      ElMessage.error('新增学生失败')
      return
    }
  }
  dialogVisible.value = false
}

// 删除单个
const deleteStudent = (student) => {
  deleteMode.value = 'single'
  pendingDeleteIds.value = [student.studentId]
  confirmText.value = `确定删除 ${student.name} 吗？`
  confirmDialogVisible.value = true
}

// 批量删除
const deleteSelected = () => {
  const count = multipleSelection.value.length
  if (!count) return
  deleteMode.value = 'batch'
  pendingDeleteIds.value = multipleSelection.value.map((s) => s.studentId)
  confirmText.value = `确认删除 ${count} 位学生？`
  confirmDialogVisible.value = true
}

// 选择项变化
const handleSelectionChange = (val) => {
  multipleSelection.value = val
}

// 搜索
const handleSearch = () => {
  ElMessage.info(`搜索关键词：${searchQuery.value || '无'}`)
}

// 查询：弹出学生详情对话框
const openDetailDialog = async (student) => {
  try {
    const res = await getBulkStudentInfo(student.studentId)
    const data = res.data || {}
    detailData.value = {
      studentId: data.username || student.studentId,
      name: data.name || student.name,
      gender: data.gender || student.gender,
      age: data.age ?? student.age,
      class: data.class_name || student.class,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      university: data.university || '',
      depart: data.depart || '',
      major: data.major || '',
      enrollment: data.enrollment || '',
      nationality: data.nationality || '',
    }
    detailDialogVisible.value = true
  } catch (e) {
    console.error('获取学生详情失败:', e)
    ElMessage.error('获取学生详情失败')
  }
}

// 确认删除（单个 / 批量）
const handleConfirmDelete = async () => {
  if (!pendingDeleteIds.value.length) {
    confirmDialogVisible.value = false
    return
  }
  try {
    await teacherDeleteBulkStudents(pendingDeleteIds.value)
    if (deleteMode.value === 'batch') {
      ElMessage.success('批量删除成功')
      multipleSelection.value = []
    } else {
      ElMessage.success('删除成功')
    }
    await loadStudents()
  } catch (e) {
    console.error('删除学生失败:', e)
    ElMessage.error(deleteMode.value === 'batch' ? '批量删除失败' : '删除失败')
  } finally {
    confirmDialogVisible.value = false
    pendingDeleteIds.value = []
  }
}

onMounted(() => {
  loadStudents()
})

// 2025-12-05 批量导入：点击按钮触发隐藏的文件选择框
const onClickImport = () => {
  if (importLoading.value) return
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 2025-12-05 批量导入：处理选择的 Excel 文件（与 StudentUser 类似但不做展示，只负责写入）
const handleFileChange = async (event) => {
  const target = event.target
  const file = target && target.files && target.files[0]
  if (!file) return

  importLoading.value = true

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = e.target && e.target.result
      if (!data) {
        ElMessage.error('文件读取失败')
        return
      }

      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        ElMessage.error('未在 Excel 中找到有效工作表')
        return
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      // 2026-01-13 批量导入调试：打印原始 rows 内容，排查哪些行被解析为空
      console.log('2026-01-13 批量导入调试 rows:', rows)
      if (!rows.length) {
        ElMessage.warning('Excel 内容为空')
        return
      }

      const header = rows[0]
      const colIndex = {
        numid: header.indexOf('学号'),
        name: header.indexOf('姓名'),
        gender: header.indexOf('性别'),
        nationality: header.indexOf('民族'),
        age: header.indexOf('年龄'),
        birth: header.indexOf('出生日期'),
        phone: header.indexOf('电话'),
        email: header.indexOf('邮箱'),
        address: header.indexOf('家庭住址'),
        university: header.indexOf('学校'),
        depart: header.indexOf('学院'),
        major: header.indexOf('专业'),
        enrollment: header.indexOf('入学日期'),
        class_name: header.indexOf('班级'),
      }

      if (colIndex.numid === -1 || colIndex.name === -1) {
        ElMessage.error('表头中至少需要包含【学号】和【姓名】列')
        return
      }

      const studentsForBulk = []
      let successCount = 0
      const errors = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        // 2026-01-13 批量导入调试：逐行打印当前行的“学号/姓名”原始值
        console.log('2026-01-13 行调试 => index:', i, 'row:', row)
        if (!row || row.every((cell) => cell == null || String(cell).trim() === '')) continue

        const rowNum = i + 1
        const numid = colIndex.numid >= 0 ? row[colIndex.numid] : ''
        const name = colIndex.name >= 0 ? row[colIndex.name] : ''
        console.log('2026-01-13 行调试 numid/name:', rowNum, numid, name)
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
          } catch (e) {
            const msg = (e && e.response && e.response.data && e.response.data.error) || e?.message || ''
            if (msg && !msg.includes('已存在') && !msg.toLowerCase().includes('exist')) {
              errors.push(`第 ${rowNum} 行：注册失败 - ${msg}`)
              continue
            }
          }

          // 2）组装学生信息，暂存到数组，后面统一调用 bulk-import 接口
          const payload = {
            username,
            name: String(name).trim(),
            gender: colIndex.gender >= 0 ? String(row[colIndex.gender] || '').trim() : '',
            nationality: colIndex.nationality >= 0 ? String(row[colIndex.nationality] || '').trim() : '',
            age: colIndex.age >= 0 ? String(row[colIndex.age] || '').trim() : '',
            birth: colIndex.birth >= 0 ? String(row[colIndex.birth] || '').trim() : '',
            phone: colIndex.phone >= 0 ? String(row[colIndex.phone] || '').trim() : '',
            email: colIndex.email >= 0 ? String(row[colIndex.email] || '').trim() : '',
            address: colIndex.address >= 0 ? String(row[colIndex.address] || '').trim() : '',
            university: colIndex.university >= 0 ? String(row[colIndex.university] || '').trim() : '',
            depart: colIndex.depart >= 0 ? String(row[colIndex.depart] || '').trim() : '',
            major: colIndex.major >= 0 ? String(row[colIndex.major] || '').trim() : '',
            enrollment: colIndex.enrollment >= 0 ? String(row[colIndex.enrollment] || '').trim() : '',
            class_name: colIndex.class_name >= 0 ? String(row[colIndex.class_name] || '').trim() : '',
          }

          studentsForBulk.push(payload)
          successCount++
        } catch (e) {
          const msg = (e && e.response && e.response.data && e.response.data.error) || e?.message || '未知错误'
          errors.push(`第 ${rowNum} 行：处理行数据失败 - ${msg}`)
        }
      }

      if (!studentsForBulk.length) {
        ElMessage.warning('没有可导入的数据行')
      } else {
        try {
          const res = await bulkStudentImport(studentsForBulk)
          const serverSuccess = res.data?.success_count ?? 0
          const serverFailed = res.data?.failed_count ?? 0
          const serverErrors = res.data?.errors || []

          ElMessage.success(
            `导入完成，本地解析成功 ${successCount} 条，后端写入成功 ${serverSuccess} 条，后端失败 ${serverFailed} 条`,
          )

          if (errors.length || serverErrors.length) {
            console.error('批量导入错误明细（前端解析 + 后端写入）：', [...errors, ...serverErrors])
          }
        } catch (e) {
          ElMessage.error('调用批量导入接口失败：' + (e?.message || '未知错误'))
        }
      }
    } catch (err) {
      console.error('Excel 解析或导入失败：', err)
      ElMessage.error('Excel 导入失败：' + (err?.message || '未知错误'))
    } finally {
      importLoading.value = false
      if (target) {
        target.value = ''
      }
    }
  }

  reader.readAsArrayBuffer(file)
}
</script>

<template>
  <div class="student-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input v-model="searchQuery" placeholder="搜索姓名或学号" clearable style="width: 300px">
        <template #append>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 操作按钮 -->
    <div class="button-group">
      <el-button type="primary" @click="openAddDialog">新增学生</el-button>
      <el-button type="danger" :disabled="!multipleSelection.length" @click="deleteSelected">
        批量删除
      </el-button>
      <!-- 2025-12-05 批量导入入口：教师端“批量添加” -->
      <el-button type="success" @click="onClickImport" :loading="importLoading">
        批量添加
      </el-button>
      <!-- 隐藏的文件选择框，仅在点击按钮时触发 -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".xlsx,.xls"
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <!-- 学生表格 -->
    <el-table
      :data="filteredStudents"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column label="序号" type="index" width="60" />
      <el-table-column prop="studentId" label="学号" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="gender" label="性别" />
      <el-table-column prop="age" label="年龄" />
      <el-table-column prop="class" label="班级" />
      <el-table-column label="操作" width="260">
        <template #default="scope">
          <el-button type="success" size="small" @click="openDetailDialog(scope.row)">查询</el-button>
          <el-button type="primary" size="small" @click="openEditDialog(scope.row)">编辑</el-button>
          <el-button type="danger" size="small" @click="deleteStudent(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredStudents.length"
        layout="prev, pager, next"
      />
    </div>

    <!-- 添加/编辑对话框（完整字段） -->
    <el-dialog :title="isEdit ? '编辑学生' : '新增学生'" v-model="dialogVisible" width="700px">
      <el-form :model="form" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="学号">
              <el-input v-model="form.studentId" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="性别">
              <el-select v-model="form.gender" placeholder="请选择">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年龄">
              <el-input type="number" v-model="form.age" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="民族">
              <el-input v-model="form.nationality" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出生日期">
              <el-input v-model="form.birth" placeholder="例如 2025-01-01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入学日期">
              <el-input v-model="form.enrollment" placeholder="例如 2025-09-01" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="电话">
              <el-input v-model="form.phone" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址">
          <el-input v-model="form.address" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="学校">
              <el-input v-model="form.university" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学院">
              <el-input v-model="form.depart" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="专业">
              <el-input v-model="form.major" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级">
              <el-input v-model="form.class" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStudent">保存</el-button>
      </template>
    </el-dialog>

    <!-- 学生详情对话框（只读） -->
    <el-dialog title="学生详情" v-model="detailDialogVisible" width="500px">
      <el-form :model="detailData" label-width="90px">
        <el-form-item label="学号">
          <span>{{ detailData.studentId }}</span>
        </el-form-item>
        <el-form-item label="姓名">
          <span>{{ detailData.name }}</span>
        </el-form-item>
        <el-form-item label="性别">
          <span>{{ detailData.gender }}</span>
        </el-form-item>
        <el-form-item label="年龄">
          <span>{{ detailData.age }}</span>
        </el-form-item>
        <el-form-item label="班级">
          <span>{{ detailData.class }}</span>
        </el-form-item>
        <el-form-item label="电话">
          <span>{{ detailData.phone }}</span>
        </el-form-item>
        <el-form-item label="邮箱">
          <span>{{ detailData.email }}</span>
        </el-form-item>
        <el-form-item label="家庭住址">
          <span>{{ detailData.address }}</span>
        </el-form-item>
        <el-form-item label="学校">
          <span>{{ detailData.university }}</span>
        </el-form-item>
        <el-form-item label="学院">
          <span>{{ detailData.depart }}</span>
        </el-form-item>
        <el-form-item label="专业">
          <span>{{ detailData.major }}</span>
        </el-form-item>
        <el-form-item label="入学日期">
          <span>{{ detailData.enrollment }}</span>
        </el-form-item>
        <el-form-item label="民族">
          <span>{{ detailData.nationality }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认对话框（el-dialog 风格） -->
    <el-dialog title="确认删除" v-model="confirmDialogVisible" width="360px">
      <span>{{ confirmText }}</span>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleConfirmDelete">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-container {
  padding: 20px;
  background: #f9f9f9;
}
.search-bar,
.button-group {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
