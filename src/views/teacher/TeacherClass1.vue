<script setup>
import { ref } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { teacherGetChannelsService } from '@/api/teacher.js'
const channelList = ref([])
const loading = ref(false)

const getChannelList = async () => {
  loading.value = true
  const res = await teacherGetChannelsService
  channelList.value = res.data.data
  loading.value = false
  //打印获取的列表信息
  console.log(channelList.value)
}
getChannelList()

const onDelChannel = async (row) => {
  await ElMessageBox.confirm('你确认要删除该分类么', '温馨提示', {
    type: 'warning',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  })
  await artDelChannelService(row.id)
  ElMessage.success('删除成功')
  getChannelList()
}
const onEditChannel = (row) => {
  dialog.value.open(row)
}
const onAddChannel = () => {
  dialog.value.open({})
}
const onSuccess = () => {
  getChannelList()
}
</script>

<template>
  <el-card class="page-container">
    <template #header>
      <div class="header">
        <span>课程列表 </span>
        <div class="extra">
          <el-button type="primary">添加课程</el-button>
        </div>
      </div>
    </template>
    <!-- loading属性是加载时有个转圈的效果v-loading="loading" -->
    <el-table :data="channelList" style="width: 100%">
      <el-table-column label="序号" type="index" width="100"></el-table-column>
      <el-table-column prop="class_name" label="课程名"></el-table-column>
      <el-table-column prop="class_person" label="人数"></el-table-column>
      <el-table-column label="操作" width="150">
        <!-- row 就是 channelList 的一项， $index 下标 -->
        <template #default="{ row, $index }">
          <el-button
            :icon="Edit"
            circle
            plain
            type="primary"
            @click="onEditChannel(row, $index)"
          ></el-button>
          <el-button
            :icon="Delete"
            circle
            plain
            type="danger"
            @click="onDelChannel(row, $index)"
          ></el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="暂无课程"></el-empty>
      </template>
    </el-table>
  </el-card>
</template>

<style lang="scss" scoped>
.page-container {
  min-height: 100%;
  box-sizing: border-box;
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
