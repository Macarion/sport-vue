import { createRouter, createWebHistory } from 'vue-router'
// 在最开始时下面哪一行会报错
// import HomeView from '../views/login/LoginPage.vue'

// createRouter创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: () => import('@/views/login/LoginPage.vue') }, // 登录页

    {
      path: '/student', //学生端
      component: () => import('@/views/layout/StudentLayout.vue'),
      redirect: '/student/test',
      children: [
        {
          path: '/student/test',
          component: () => import('@/views/student/StudentTest.vue'),
        },
        {
          path: '/student/report',
          component: () => import('@/views/student/StudentReport.vue'),
        },
        {
          path: '/student/user',
          component: () => import('@/views/student/StudentUser.vue'),
        },
        {
          path: '/student/testingsitup',
          component: () => import('@/views/student/StudentTestingSitup.vue'),
        },
        {
          path: '/student/testingpullup',
          component: () => import('@/views/student/StudentTestingPullup.vue'),
        },
        {
          path: '/student/testingsitreach',
          name: 'SitReach',
          component: () => import('@/views/student/StudentTestingSitReach.vue'),
        },
        {
          path: '/student/testingstandjump',
          component: () => import('@/views/student/StudentTestingStandjump.vue'),
        },
        {
          path: '/student/testingrace-uwb',
          component: () => import('@/views/student/StudentTestingRaceUwb.vue'),
        },
        {
          path: '/student/class',
          component: () => import('@/views/student/StudentClass.vue'),
        },
        {
          path: '/student/class-score',
          component: () => import('@/views/student/StudentClassScore.vue'),
        },
        {
          path: '/student/messages',
          component: () => import('@/views/student/StudentMessages.vue'),
        },
        {
          path: '/student/mytest',
          component: () => import('@/views/layout/test.vue'), //测试页面
        },
      ],
    },

    {
      path: '/teacher', //教师端
      component: () => import('@/views/layout/TeacherLayout.vue'),
      redirect: '/teacher/test',
      children: [
        {
          path: '/teacher/test',
          component: () => import('@/views/teacher/TeacherTest.vue'),
        },
        {
          path: '/teacher/class',
          component: () => import('@/views/teacher/TeacherClass.vue'),
        },
        {
          path: '/teacher/user',
          component: () => import('@/views/teacher/TeacherUser.vue'),
        },
        {
          path: '/teacher/show',
          component: () => import('@/views/teacher/TeacherShow.vue'),
        },
        {
          path: '/teacher/messages',
          component: () => import('@/views/teacher/TeacherMessages.vue'),
        },
      ],
    },

    {
      path: '/manager', //管理员端
      component: () => import('@/views/layout/ManagerLayout.vue'),
      redirect: '/manager/class-create',
      children: [
        {
          path: '/manager/class-create',
          component: () => import('@/views/manager/ManagerClassCreate.vue'),
        },
        {
          path: '/manager/user-import',
          component: () => import('@/views/manager/ManagerUserImport.vue'),
        },
        {
          path: '/manager/user-query',
          component: () => import('@/views/manager/ManagerUserQuery.vue'),
        },
        // 保留旧页面
        {
          path: '/manager/person',
          component: () => import('@/views/manager/ManagerPerson.vue'),
        },
        {
          path: '/manager/Data',
          component: () => import('@/views/manager/ManagerData.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, from, next) => {
  const role = localStorage.getItem('role')
  const studentInfoCompleted = localStorage.getItem('studentInfoCompleted') === 'true'

  console.log('[守卫触发] to:', to.path, 'role:', role, 'isCompleted:', studentInfoCompleted)

  if (role === 'student' && !studentInfoCompleted && !to.path.startsWith('/student/user')) {
    ElMessage.warning('请先完善个人信息')
    return next('/student/user')
  }

  next()
})

export default router
