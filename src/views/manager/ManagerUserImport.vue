<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { adminBulkImport } from '@/api/user.js'

// 用户类型
const userType = ref('student')

// 导入状态
const importLoading = ref(false)
const fileInputRef = ref(null)

// 预览数据
const previewData = ref([])
const showPreview = ref(false)

// 点击选择文件
const onClickImport = () => {
  if (importLoading.value) return
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 处理文件选择
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
      if (!rows.length) {
        ElMessage.warning('Excel 内容为空')
        return
      }

      const header = rows[0]
      const colIndex = {
        username: header.indexOf('学号'),
        name: header.indexOf('姓名'),
        gender: header.indexOf('性别'),
        age: header.indexOf('年龄'),
        class_name: header.indexOf('班级'),
        phone: header.indexOf('电话'),
        email: header.indexOf('邮箱')
      }

      if (colIndex.username === -1 || colIndex.name === -1) {
        ElMessage.error('表头中至少需要包含【学号】和【姓名】列')
        return
      }

      // 解析数据
      const parsedData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.every((cell) => cell == null || String(cell).trim() === '')) continue

        const username = colIndex.username >= 0 ? row[colIndex.username] : ''
        const name = colIndex.name >= 0 ? row[colIndex.name] : ''

        if (!username || !name) continue

        parsedData.push({
          username: String(username).trim(),
          name: String(name).trim(),
          gender: colIndex.gender >= 0 ? String(row[colIndex.gender] || '').trim() : '',
          age: colIndex.age >= 0 ? String(row[colIndex.age] || '').trim() : '',
          class_name: colIndex.class_name >= 0 ? String(row[colIndex.class_name] || '').trim() : '',
          phone: colIndex.phone >= 0 ? String(row[colIndex.phone] || '').trim() : '',
          email: colIndex.email >= 0 ? String(row[colIndex.email] || '').trim() : '',
          status: '待导入'
        })
      }

      if (!parsedData.length) {
        ElMessage.warning('没有可导入的数据行')
        return
      }

      previewData.value = parsedData
      showPreview.value = true
      ElMessage.success(`成功解析 ${parsedData.length} 条数据`)
    } catch (err) {
      console.error('Excel 解析失败：', err)
      ElMessage.error('Excel 解析失败：' + (err?.message || '未知错误'))
    } finally {
      importLoading.value = false
      if (target) {
        target.value = ''
      }
    }
  }

  reader.readAsArrayBuffer(file)
}

// 开始导入
const startImport = async () => {
  if (!previewData.value.length) {
    ElMessage.warning('没有可导入的数据')
    return
  }

  importLoading.value = true
  try {
    const users = previewData.value.map(item => ({
      username: item.username,
      name: item.name,
      gender: item.gender,
      age: item.age,
      class_name: item.class_name,
      phone: item.phone,
      email: item.email
    }))

    const res = await adminBulkImport(userType.value, users)
    const { success_count, failed_count, errors } = res.data

    // 更新状态
    previewData.value.forEach((item, index) => {
      if (index < success_count) {
        item.status = '✓ 成功'
      } else {
        item.status = '✗ 失败'
      }
    })

    ElMessage.success(`导入完成！成功 ${success_count} 条，失败 ${failed_count} 条`)
    
    if (errors && errors.length > 0) {
      console.warn('导入错误详情:', errors)
    }
  } catch (error) {
    console.error('批量导入失败:', error)
    ElMessage.error('批量导入失败')
    
    // 标记所有为失败
    previewData.value.forEach(item => {
      item.status = '✗ 失败'
    })
  } finally {
    importLoading.value = false
  }
}

// 下载模板
const downloadTemplate = () => {
  const templateData = [
    ['学号', '姓名', '性别', '年龄', '班级', '电话', '邮箱'],
    ['2024001', '张三', '男', '20', '计科1班', '13800138000', 'zhangsan@example.com'],
    ['2024002', '李四', '女', '19', '软工2班', '13800138001', 'lisi@example.com']
  ]

  const ws = XLSX.utils.aoa_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用户模板')
  XLSX.writeFile(wb, `${userType.value === 'student' ? '学生' : '教师'}导入模板.xlsx`)

  ElMessage.success('模板下载成功')
}

// 清空预览
const clearPreview = () => {
  previewData.value = []
  showPreview.value = false
}
</script>

<template>
  <div class="import-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon style="vertical-align: middle; margin-right: 8px"><Upload /></el-icon>
        批量用户导入
      </h2>
      <p class="subtitle">通过Excel文件批量导入学生或教师账号</p>
    </div>

    <!-- 导入配置 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <span>导入配置</span>
      </template>

      <el-form label-width="100px">
        <el-form-item label="用户类型">
          <el-radio-group v-model="userType">
            <el-radio value="student">学生</el-radio>
            <el-radio value="teacher">教师</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="选择文件">
          <div class="file-actions">
            <el-button type="primary" :loading="importLoading" @click="onClickImport">
              <el-icon style="margin-right: 5px"><Upload /></el-icon>
              选择Excel文件
            </el-button>
            <el-button @click="downloadTemplate">
              <el-icon style="margin-right: 5px"><Download /></el-icon>
              下载模板
            </el-button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleFileChange"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 导入预览 -->
    <el-card v-if="showPreview" class="preview-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>导入预览</span>
          <div>
            <el-button type="success" :loading="importLoading" @click="startImport">开始导入</el-button>
            <el-button @click="clearPreview">清空</el-button>
          </div>
        </div>
      </template>

      <el-table :data="previewData" border style="width: 100%" max-height="400">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="username" label="学号/工号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="class_name" label="班级" width="150" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="status" label="状态" width="100" fixed="right">
          <template #default="scope">
            <el-tag :type="scope.row.status === '✓ 成功' ? 'success' : 'info'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.import-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.config-card,
.preview-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.file-actions {
  display: flex;
  gap: 10px;
}

pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
