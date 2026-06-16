<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus, Edit, Delete, View } from '@element-plus/icons-vue'
import { 
  adminGetStudentList, 
  adminGetTeacherList,
  adminDeleteStudents, 
  adminGetStudentScores, 
  adminAddScore, 
  adminUpdateScore, 
  adminDeleteScore 
} from '@/api/user.js'

// 学生数据
const students = ref([])
const teachers = ref([])
const activeUserType = ref('student')
const studentLoading = ref(false)
const teacherLoading = ref(false)

// 搜索
const searchQuery = ref('')
const filteredStudents = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return students.value.filter(
    (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
  )
})
const filteredTeachers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return teachers.value.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(q) ||
      teacher.teacherId.toLowerCase().includes(q) ||
      teacher.classText.toLowerCase().includes(q)
  )
})
const tableLoading = computed(() =>
  activeUserType.value === 'student' ? studentLoading.value : teacherLoading.value
)
const searchPlaceholder = computed(() =>
  activeUserType.value === 'student' ? '搜索姓名或学号' : '搜索教师姓名、工号或班级'
)

// 加载学生列表
const loadStudents = async () => {
  studentLoading.value = true
  try {
    const res = await adminGetStudentList()
    students.value = res.data?.students || []
  } catch (error) {
    console.error('获取学生列表失败:', error)
    ElMessage.error('获取学生列表失败')
  } finally {
    studentLoading.value = false
  }
}

const loadTeachers = async () => {
  teacherLoading.value = true
  try {
    const res = await adminGetTeacherList()
    teachers.value = res.data?.teachers || []
  } catch (error) {
    console.error('获取教师列表失败:', error)
    ElMessage.error('获取教师列表失败')
  } finally {
    teacherLoading.value = false
  }
}

// 成绩管理对话框
const scoreDialogVisible = ref(false)
const currentStudent = ref(null)
const currentScores = ref([])
const scoresLoading = ref(false)

// 打开成绩管理对话框
const openScoreDialog = async (student) => {
  currentStudent.value = student
  scoreDialogVisible.value = true
  
  scoresLoading.value = true
  try {
    const res = await adminGetStudentScores(student.studentId)
    currentScores.value = res.data?.scores || []
  } catch (error) {
    console.error('获取学生成绩失败:', error)
    ElMessage.error('获取学生成绩失败')
    currentScores.value = []
  } finally {
    scoresLoading.value = false
  }
}

// 新增成绩对话框
const addScoreDialogVisible = ref(false)
const scoreForm = ref({
  itemName: '仰卧起坐',
  score: null
})

const openAddScoreDialog = () => {
  scoreForm.value = {
    itemName: '仰卧起坐',
    score: null
  }
  addScoreDialogVisible.value = true
}

// 保存新增成绩
const saveScore = async () => {
  if (!scoreForm.value.score) {
    ElMessage.error('请输入成绩')
    return
  }

  try {
    await adminAddScore(
      currentStudent.value.studentId,
      scoreForm.value.itemName,
      scoreForm.value.score
    )
    
    ElMessage.success('成绩添加成功')
    addScoreDialogVisible.value = false
    
    // 重新加载成绩列表
    await openScoreDialog(currentStudent.value)
  } catch (error) {
    console.error('添加成绩失败:', error)
    ElMessage.error('添加成绩失败')
  }
}

// 编辑成绩对话框
const editScoreDialogVisible = ref(false)
const editScoreForm = ref({
  testid: null,
  score: null
})
const deleteConfirmVisible = ref(false)
const deleteConfirmType = ref('')
const pendingDeleteScore = ref(null)

const openEditScoreDialog = (score) => {
  editScoreForm.value = {
    testid: score.testid,
    score: score.score
  }
  editScoreDialogVisible.value = true
}

// 保存编辑成绩
const updateScore = async () => {
  try {
    await adminUpdateScore(editScoreForm.value.testid, editScoreForm.value.score)
    
    ElMessage.success('成绩修改成功')
    editScoreDialogVisible.value = false
    
    // 重新加载成绩列表
    await openScoreDialog(currentStudent.value)
  } catch (error) {
    console.error('修改成绩失败:', error)
    ElMessage.error('修改成绩失败')
  }
}

// 删除成绩
const deleteScore = (score) => {
  pendingDeleteScore.value = score
  deleteConfirmType.value = 'score'
  deleteConfirmVisible.value = true
}

// 批量删除
const multipleSelection = ref([])
const handleSelectionChange = (val) => {
  multipleSelection.value = val
}

const handleUserTypeChange = () => {
  searchQuery.value = ''
  multipleSelection.value = []
}

const deleteSelected = () => {
  if (!multipleSelection.value.length) return

  deleteConfirmType.value = 'students'
  deleteConfirmVisible.value = true
}

const closeDeleteConfirm = () => {
  deleteConfirmVisible.value = false
  deleteConfirmType.value = ''
  pendingDeleteScore.value = null
}

const confirmDelete = async () => {
  if (deleteConfirmType.value === 'score') {
    if (!pendingDeleteScore.value) return

    try {
      await adminDeleteScore(pendingDeleteScore.value.testid)
      ElMessage.success('成绩删除成功')
      closeDeleteConfirm()
      await openScoreDialog(currentStudent.value)
    } catch (error) {
      console.error('删除成绩失败:', error)
      ElMessage.error(error?.response?.data?.error || '删除成绩失败')
    }
    return
  }

  if (deleteConfirmType.value !== 'students' || !multipleSelection.value.length) {
    return
  }

  try {
    const studentIds = multipleSelection.value.map((s) => s.studentId)
    await adminDeleteStudents(studentIds)
    
    ElMessage.success(`已删除 ${multipleSelection.value.length} 位学生`)
    multipleSelection.value = []
    closeDeleteConfirm()
    
    // 重新加载学生列表
    await loadStudents()
  } catch (error) {
    console.error('批量删除失败:', error)
    ElMessage.error(error?.response?.data?.error || '批量删除失败')
  }
}

// 页面加载时获取学生列表
onMounted(() => {
  loadStudents()
  loadTeachers()
})
</script>

<template>
  <div class="query-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        <el-icon style="vertical-align: middle; margin-right: 8px"><Search /></el-icon>
        用户信息查询
      </h2>
      <p class="subtitle">查询和管理学生、教师信息及学生成绩数据</p>
    </div>

    <div class="user-type-switch">
      <el-radio-group v-model="activeUserType" @change="handleUserTypeChange">
        <el-radio-button value="student">学生列表</el-radio-button>
        <el-radio-button value="teacher">教师列表</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        :placeholder="searchPlaceholder"
        clearable
        style="width: 300px"
      >
        <template #append>
          <el-button type="primary">
            <el-icon><Search /></el-icon>
          </el-button>
        </template>
      </el-input>
    </div>

    <!-- 操作按钮 -->
    <div class="button-group" v-if="activeUserType === 'student'">
      <el-button type="danger" :disabled="!multipleSelection.length" @click="deleteSelected">
        批量删除
      </el-button>
    </div>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ activeUserType === 'student' ? '学生列表' : '教师列表' }}</span>
          <span class="table-summary">
            共 {{ activeUserType === 'student' ? filteredStudents.length : filteredTeachers.length }} 位{{ activeUserType === 'student' ? '学生' : '教师' }}
          </span>
        </div>
      </template>

      <el-table
        v-if="activeUserType === 'student'"
        :data="filteredStudents"
        :loading="tableLoading"
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="studentId" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="class" label="班级" width="150" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="success" size="small" @click="openScoreDialog(scope.row)">
              <el-icon style="margin-right: 3px"><View /></el-icon>
              查看成绩
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-else
        :data="filteredTeachers"
        :loading="tableLoading"
        border
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="teacherId" label="教师工号" width="140" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="90" />
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="classText" label="所带班级" min-width="220" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.classText || '未分配班级' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 成绩管理对话框 -->
    <el-dialog
      v-model="scoreDialogVisible"
      :title="`学生成绩管理 - ${currentStudent?.name}（${currentStudent?.studentId}）`"
      width="800px"
    >
      <div style="margin-bottom: 15px">
        <el-button type="primary" size="small" @click="openAddScoreDialog">
          <el-icon style="margin-right: 3px"><Plus /></el-icon>
          新增成绩
        </el-button>
      </div>

      <el-table :data="currentScores" :loading="scoresLoading" border style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="itemName" label="项目名称" width="150" />
        <el-table-column prop="score" label="成绩" width="100" />
        <el-table-column prop="testtime" label="测试时间" width="180" />
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" size="small" @click="openEditScoreDialog(scope.row)">
              <el-icon style="margin-right: 3px"><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteScore(scope.row)">
              <el-icon style="margin-right: 3px"><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button type="primary" @click="scoreDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增成绩对话框 -->
    <el-dialog v-model="addScoreDialogVisible" title="新增成绩" width="400px">
      <el-form :model="scoreForm" label-width="90px">
        <el-form-item label="项目名称">
          <el-select v-model="scoreForm.itemName" placeholder="请选择">
            <el-option label="仰卧起坐" value="仰卧起坐" />
            <el-option label="引体向上" value="引体向上" />
          </el-select>
        </el-form-item>
        <el-form-item label="成绩">
          <el-input-number
            v-model="scoreForm.score"
            :min="0"
            :max="100"
            :precision="1"
            placeholder="请输入成绩"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addScoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveScore">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑成绩对话框 -->
    <el-dialog v-model="editScoreDialogVisible" title="编辑成绩" width="400px">
      <el-form :model="editScoreForm" label-width="90px">
        <el-form-item label="成绩">
          <el-input-number
            v-model="editScoreForm.score"
            :min="0"
            :max="100"
            :precision="1"
            placeholder="请输入成绩"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editScoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateScore">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteConfirmVisible"
      width="420px"
      align-center
      @close="closeDeleteConfirm"
    >
      <template #header>
        <div class="delete-dialog-header">
          <span class="delete-badge">!</span>
          <span>确认删除</span>
        </div>
      </template>

      <div class="delete-dialog-content">
        <p class="delete-title" v-if="deleteConfirmType === 'score'">此操作将删除当前成绩记录</p>
        <p class="delete-title" v-else>此操作将删除选中的学生账号与数据</p>
        <p class="delete-name" v-if="deleteConfirmType === 'score'">
          {{ pendingDeleteScore?.itemName }}：{{ pendingDeleteScore?.score }}
        </p>
        <p class="delete-name" v-else>
          共 {{ multipleSelection.length }} 位学生
        </p>
        <p class="delete-tip" v-if="deleteConfirmType === 'score'">删除后该成绩将不可恢复。</p>
        <p class="delete-tip" v-else>删除后将同步移除学生基础信息与关联成绩。</p>
      </div>

      <template #footer>
        <el-button @click="closeDeleteConfirm">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.query-container {
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

.search-bar,
.button-group {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.user-type-switch {
  margin-bottom: 16px;
}

.table-card {
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

.table-summary {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #303133;
  font-weight: 600;
}

.delete-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-weight: 700;
}

.delete-dialog-content {
  text-align: center;
  padding: 8px 0 4px;
}

.delete-title {
  margin: 0 0 12px;
  font-size: 15px;
  color: #303133;
}

.delete-name {
  margin: 0 0 12px;
  color: #f56c6c;
  font-size: 18px;
  font-weight: 700;
}

.delete-tip {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
</style>
