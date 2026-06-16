<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Management } from '@element-plus/icons-vue'
import {
  adminCreateClass,
  adminDeleteClass,
  adminGetClassList,
  adminGetTeacherList,
  adminUpdateClass
} from '@/api/user.js'

const classList = ref([])
const teacherList = ref([])
const loading = ref(false)
const teacherLoading = ref(false)

const dialogVisible = ref(false)
const isEdit = ref(false)
const deleteDialogVisible = ref(false)
const pendingDeleteRow = ref(null)
const form = ref({
  classid: null,
  classname: '',
  teacherId: '',
  remark: ''
})

const loadClassList = async () => {
  loading.value = true
  try {
    const res = await adminGetClassList()
    classList.value = res.data?.classes || []
  } catch (error) {
    console.error('获取班级列表失败:', error)
    ElMessage.error('获取班级列表失败')
  } finally {
    loading.value = false
  }
}

const loadTeacherList = async () => {
  teacherLoading.value = true
  try {
    const res = await adminGetTeacherList()
    teacherList.value = res.data?.teachers || []
  } catch (error) {
    console.error('获取教师列表失败:', error)
    ElMessage.error('获取教师列表失败')
  } finally {
    teacherLoading.value = false
  }
}

const openAddDialog = () => {
  form.value = {
    classid: null,
    classname: '',
    teacherId: '',
    remark: ''
  }
  isEdit.value = false
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  form.value = {
    classid: row.classid,
    classname: row.classname,
    teacherId: row.teacherId || '',
    remark: row.remark || ''
  }
  isEdit.value = true
  dialogVisible.value = true
}

const saveClass = async () => {
  if (!form.value.classname) {
    ElMessage.error('请填写班级名称')
    return
  }

  try {
    if (isEdit.value) {
      await adminUpdateClass(
        form.value.classid,
        form.value.classname,
        form.value.remark,
        form.value.teacherId
      )
      ElMessage.success('班级信息已更新')
    } else {
      await adminCreateClass(
        form.value.classname,
        form.value.remark,
        form.value.teacherId
      )
      ElMessage.success('班级创建成功')
    }

    dialogVisible.value = false
    await loadClassList()
  } catch (error) {
    console.error('保存班级失败:', error)
    ElMessage.error(error?.response?.data?.error || (isEdit.value ? '更新班级失败' : '创建班级失败'))
  }
}

const deleteClass = (row) => {
  pendingDeleteRow.value = row
  deleteDialogVisible.value = true
}

const confirmDeleteClass = async () => {
  if (!pendingDeleteRow.value) return

  try {
    await adminDeleteClass(pendingDeleteRow.value.classid)
    ElMessage.success('班级已删除')
    deleteDialogVisible.value = false
    pendingDeleteRow.value = null
    await loadClassList()
  } catch (error) {
    console.error('删除班级失败:', error)
    ElMessage.error(error?.response?.data?.error || '删除班级失败')
  }
}

const cancelDeleteClass = () => {
  deleteDialogVisible.value = false
  pendingDeleteRow.value = null
}

onMounted(async () => {
  await Promise.all([loadClassList(), loadTeacherList()])
})
</script>

<template>
  <div class="class-container">
    <div class="page-header">
      <h2>
        <el-icon style="vertical-align: middle; margin-right: 8px"><Management /></el-icon>
        班级管理
      </h2>
      <p class="subtitle">为班级绑定负责教师，一个教师可管理多个班级，未绑定时显示为无</p>
    </div>

    <div class="button-group">
      <el-button type="primary" @click="openAddDialog">新增班级</el-button>
    </div>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>班级列表</span>
          <span class="table-summary">共 {{ classList.length }} 个班级</span>
        </div>
      </template>

      <el-table :data="classList" :loading="loading" border style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="classid" label="班级ID" width="120" />
        <el-table-column prop="classname" label="班级名称" min-width="180" />
        <el-table-column label="负责教师" min-width="180">
          <template #default="scope">
            {{ scope.row.teacherName || '无' }}
          </template>
        </el-table-column>
        <el-table-column prop="createtime" label="创建时间" width="180" />
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="openEditDialog(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteClass(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="isEdit ? '编辑班级' : '新增班级'" v-model="dialogVisible" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="班级名称" required>
          <el-input v-model="form.classname" placeholder="请输入班级名称" />
        </el-form-item>
        <el-form-item label="负责教师">
          <el-select
            v-model="form.teacherId"
            placeholder="请选择教师"
            clearable
            filterable
            :loading="teacherLoading"
            style="width: 100%"
          >
            <el-option
              v-for="teacher in teacherList"
              :key="teacher.teacherId"
              :label="`${teacher.name}（${teacher.teacherId}）`"
              :value="teacher.teacherId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注信息">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveClass">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" width="420px" align-center @close="cancelDeleteClass">
      <template #header>
        <div class="delete-dialog-header">
          <span class="delete-badge">!</span>
          <span>确认删除班级</span>
        </div>
      </template>

      <div class="delete-dialog-content">
        <p class="delete-title">此操作将删除当前班级信息</p>
        <p class="delete-name">{{ pendingDeleteRow?.classname }}</p>
        <p class="delete-tip">若班级仍绑定教师或学生，系统会阻止删除。</p>
      </div>

      <template #footer>
        <el-button @click="cancelDeleteClass">取消</el-button>
        <el-button type="danger" @click="confirmDeleteClass">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.class-container {
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

.button-group {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.table-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
