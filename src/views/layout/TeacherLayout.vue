<script setup>
import {
  Management,
  Promotion,
  User,
  Crop,
  EditPen,
  SwitchButton,
  CaretBottom,
} from '@element-plus/icons-vue'
import avatar from '@/assets/default.png'
</script>

<template>
  <el-container class="layout-container">
    <el-aside width="200px">
      <div class="el-aside__logo"></div>
      <el-menu
        active-text-color="#ffd04b"
        background-color="#232323"
        :default-active="$route.path"
        text-color="#fff"
        router
      >
        <el-menu-item index="/teacher/test">
          <el-icon><Management /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        <el-menu-item index="/teacher/class">
          <el-icon><Promotion /></el-icon>
          <span>班级管理</span>
        </el-menu-item>
        <el-menu-item index="/teacher/user">
          <el-icon><Promotion /></el-icon>
          <span>个人中心</span>
        </el-menu-item>
        <el-menu-item index="/teacher/show">
          <el-icon><Promotion /></el-icon>
          <span>展示</span>
        </el-menu-item>
        <el-menu-item index="/teacher/messages">
          <el-icon><Promotion /></el-icon>
          <span>学生留言</span>
        </el-menu-item>
        
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div><strong>教师端</strong></div>
        <el-dropdown placement="bottom-end">
          <span class="el-dropdown__box">
            <el-avatar :src="avatar" />
            <el-icon><CaretBottom /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile" :icon="User">基本资料</el-dropdown-item>
              <el-dropdown-item command="avatar" :icon="Crop">更换头像</el-dropdown-item>
              <el-dropdown-item command="password" :icon="EditPen">重置密码</el-dropdown-item>
              <el-dropdown-item command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  .el-aside {
    background-color: #232323;
    &__logo {
      height: 120px;
      background: url('@/assets/logo3.png') no-repeat center / 120px auto;
    }
    .el-menu {
      border-right: none;
    }
  }
  .el-header {
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .el-dropdown__box {
      display: flex;
      align-items: center;
      .el-icon {
        color: #999;
        margin-left: 10px;
      }

      &:active,
      &:focus {
        outline: none;
      }
    }
  }
  .el-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #666;
  }
}

// chatgpg
.el-aside {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
  transition: all 0.3s ease;

  &__logo {
    height: 120px;
    background: url('@/assets/logo.png') no-repeat center / 140px auto;
    filter: drop-shadow(0 0 5px #00eaff);
    margin-bottom: 10px;
  }

  .el-menu {
    background-color: transparent;
    border-right: none;

    .el-menu-item {
      color: #ccc;
      transition: all 0.3s ease;
      font-weight: 500;
      letter-spacing: 3px;
      font-size: 18px;

      &:hover {
        background-color: rgba(0, 255, 255, 0.1);
        color: #00eaff;
        transform: scale(1.18);
      }

      &.is-active {
        background-color: rgba(0, 255, 255, 0.2);
        color: #00eaff;
        font-weight: bold;
      }

      .el-icon {
        color: #00eaff;
        margin-right: 8px;
      }
    }

    /* 全局修改所有菜单项 */
    .el-menu-item {
      padding: 0 20px !important; /* 水平间距 */
      margin: 5px 0 !important; /* 垂直间距 */
    }

    /* 修改子菜单标题间距 */
    .el-sub-menu__title {
      padding: 0 20px !important;
    }
  }
}
</style>
