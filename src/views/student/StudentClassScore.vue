<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getStudentClassScores } from '@/api/user.js'

const loading = ref(false)
const classInfo = ref({ id: null, name: '' })
const students = ref([]) // [{ studentId, name, gender, age, class, situpScore, pullupScore, totalScore, rating }]
const warning = ref('')

const loadClassScores = async () => {
  loading.value = true
  try {
    const res = await getStudentClassScores()
    const data = res.data || {}
    classInfo.value = data.class || { id: null, name: '' }
    warning.value = data.warning || ''
    const raw = data.classmates || []

    students.value = raw.map((s) => {
      const scores = s.scores || {}
      const sit = scores['仰卧起坐'] || {}
      const pull = scores['引体向上'] || {}

      const sitScore = typeof sit.score0 === 'number' ? sit.score0 : null
      const pullScore = typeof pull.score0 === 'number' ? pull.score0 : null

      // 计算综合得分：两项都有取平均，只有一项取该项
      let total = null
      if (sitScore != null && pullScore != null) {
        total = Number(((sitScore + pullScore) / 2).toFixed(1))
      } else if (sitScore != null) {
        total = Number(sitScore.toFixed(1))
      } else if (pullScore != null) {
        total = Number(pullScore.toFixed(1))
      }

      // 区间评级：0-60 不合格；60-80 合格；80-90 良好；90-100 优秀
      let rating = ''
      if (total == null) {
        rating = ''
      } else if (total < 60) {
        rating = '不合格'
      } else if (total < 80) {
        rating = '合格'
      } else if (total < 90) {
        rating = '良好'
      } else {
        rating = '优秀'
      }

      return {
        studentId: s.studentId || s.userid || '',
        name: s.name || '',
        gender: s.gender || '',
        age: s.age ?? '',
        class: s.class || s.class_name || (classInfo.value && classInfo.value.name) || '',
        situpScore: sitScore,
        pullupScore: pullScore,
        totalScore: total,
        rating,
      }
    })
  } catch (e) {
    console.error('加载班级成绩失败:', e)
    ElMessage.error('加载班级成绩失败')
  } finally {
    loading.value = false
  }
}

const hasData = computed(() => students.value.length > 0)

onMounted(() => {
  loadClassScores()
})
</script>

<template>
  <div class="page-container">
    <el-card class="header-card" shadow="never">
      <div class="header-main">
        <div class="title">
          <h2>班级成绩</h2>
          <p class="subtitle">
            {{
              classInfo.name
                ? `当前班级：${classInfo.name}（仅显示仰卧起坐 / 引体向上最近一次成绩）`
                : '当前尚未绑定班级'
            }}
          </p>
        </div>
        <div v-if="warning" class="warning-text">
          {{ warning }}
        </div>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <span>同班同学列表</span>
          <span class="summary">共 {{ students.length }} 人</span>
        </div>
      </template>

      <el-empty v-if="!hasData && !loading" description="暂无班级成绩数据" />

      <el-table
        v-else
        :data="students"
        border
        :loading="loading"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="studentId" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="class" label="班级" width="140" />
        <el-table-column prop="situpScore" label="仰卧起坐成绩" width="140" />
        <el-table-column prop="pullupScore" label="引体向上成绩" width="140" />
        <el-table-column prop="totalScore" label="综合得分" width="120" />
        <el-table-column prop="rating" label="等级" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.header-card {
  margin-bottom: 16px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

.warning-text {
  font-size: 13px;
  color: #e6a23c;
}

.table-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary {
  font-size: 12px;
  color: #909399;
}
</style>


