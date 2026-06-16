<script setup>
import {
  Management,
  Promotion,
  UserFilled,
  User,
  Crop,
  EditPen,
  SwitchButton,
  CaretBottom,
} from '@element-plus/icons-vue'
import avatar from '@/assets/default.png'
import { useUserStore } from '@/stores'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()

const getUser = async () => {
  const res = await fetch('/api/getUserInfo') // 直接获取用户信息，无需 token
  user.value = res.data
}

const handleCommand = async (key) => {
  if (key === 'logout') {
    // 这里不再做任何退出操作
  } else {
    // 跳转操作
    router.push(`/user/${key}`)
  }
}

const loginsitup = async () => {
  router.push('/student/testingsitup')
}
const loginpullup = async () => {
  router.push('/student/testingpullup')
}
</script>

<template>
  <el-container class="layout-container">
    <el-container>
      <el-main>
        <!-- 添加八个按钮，并使用网格布局 -->
        <div class="button-container">
          <el-button
            @click="loginsitup"
            type="info"
            class="full-width-button1 animated-button bg-image7"
            ><span>仰卧起坐</span></el-button
          >
          <el-button
            @click="loginpullup"
            type="info"
            class="full-width-button1 animated-button bg-image6"
            ><span>引体向上</span></el-button
          >
          <el-button type="primary" class="full-width-button bg-image1"
            ><span>身高/体重</span></el-button
          >
          <el-button type="success" class="full-width-button bg-image2"
            ><span>坐位体前屈</span></el-button
          >
          <el-button type="info" class="full-width-button bg-image3"><span>肺活量</span></el-button>
          <el-button type="info" class="full-width-button bg-image4"><span>50米跑</span></el-button>
          <el-button type="info" class="full-width-button bg-image5"
            ><span>800/1000米跑</span></el-button
          >
          <el-button type="info" class="full-width-button bg-image8"
            ><span>立定跳远</span></el-button
          >
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 98%;
  .el-aside {
    background-color: #232323;
    &__logo {
      height: 120px;
      background: url('@/assets/logo.png') no-repeat center / 120px auto;
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
  .el-main {
    margin: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    .button-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr); // 4 columns for 8 buttons
      grid-template-rows: repeat(2, 1fr); // 2 rows
      width: 100%;
      height: 98%;
      gap: 10px;
      .full-width-button {
        position: relative; // 添加相对定位
        width: 75%;
        height: 75%;
        margin: 0;
        border-radius: 15px;
        overflow: hidden; // 防止文字溢出
        padding: 0;
        filter: grayscale(200%); /* 图片变灰 */

        // 移除 text-shadow、color 相关样式，统一交给底部文字处理

        span {
          position: absolute;
          bottom: 10px; // 调整文字距底部距离
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
          pointer-events: none; // 禁止影响点击
        }
      }

      .full-width-button1 {
        position: relative; // 添加相对定位
        width: 75%;
        height: 75%;
        margin: 0;
        border-radius: 15px;
        overflow: hidden; // 防止文字溢出
        padding: 0;

        // 移除 text-shadow、color 相关样式，统一交给底部文字处理

        span {
          position: absolute;
          bottom: 10px; // 调整文字距底部距离
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: rgb(255, 255, 255);
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
          pointer-events: none; // 禁止影响点击
        }
      }

      .animated-button {
        &:hover {
          transform: scale(1.15);
          filter: brightness(1.1);
          span {
            transform: scale(1.1);
            text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
          }
        }
        &:active {
          transform: scale(0.95);
          filter: brightness(0.9);
          span {
            transform: scale(0.9);
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            color: #ffd700; // Change text color to yellow on click
          }
        }
      }
      .black-button {
        background-color: #000;
        color: #fff;
      }
      .bg-image1 {
        background: url('@/assets/image1.jpg') no-repeat center / cover;
      }
      .bg-image2 {
        background: url('@/assets/image2.jpg') no-repeat center / cover;
      }
      .bg-image3 {
        background: url('@/assets/image3.jpg') no-repeat center / cover;
      }
      .bg-image4 {
        background: url('@/assets/image4.jpg') no-repeat center / cover;
      }
      .bg-image5 {
        background: url('@/assets/image5.jpg') no-repeat center / cover;
      }
      .bg-image6 {
        background: url('@/assets/image6.jpg') no-repeat center / cover;
      }
      .bg-image7 {
        background: url('@/assets/image7.jpg') no-repeat center / cover;
      }
      .bg-image8 {
        background: url('@/assets/image8.jpg') no-repeat center / cover;
      }
    }
  }
}
</style>
