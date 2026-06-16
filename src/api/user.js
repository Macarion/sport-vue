import request, { authBaseURL, baseURL } from '@/utils/request'
import { getAccess, getRefresh, setAccess, clearAuth } from '@/utils/token'
import axios from 'axios'
// 注册接口
export const userRegisterService = ({ username, password, repassword, role }) =>
  request.post('/api/register/', { username, password, repassword, role })

// 登录接口
export const userLoginService = ({ username, password, role }) =>
  request.post('/api/login/', { username, password, role })

// 学生基本信息
export const userGetInfoService = () => request.get('/api/student/user')

// 更新学生基本信息
export const userUpdateInfoService = ({ studentForm, username }) =>
  request.post('/api/student/userInfo/', { studentForm, username })

export const userUpdateTestingInfo = ({ json }) =>
  request.post('/api/student/userTestingInfo/', { json })

export const userUpdateTestingImg = ({ Img }) =>
  request.post('/api/student/userTestingImg/', { Img })

// 学生端发送班级id
export const studentSendTeacherId = ({ teacherId }) =>
  request.post('/api/student/user', { teacherId })

// 教师基本信息
export const teacherGetInfoService = () => request.get('/api/teacher/user')

// 更新教师基本信息
export const teacherUpdateInfoService = ({ teacherForm }) =>
  request.put('/api/teacher/user', { teacherForm })

// 教师端发送班级id
export const teacherSendTeacherId = ({ classId }) => request.post('/api/teacher/user/', { classId })

// 教师端发送班级通知
export const teacherSendClassNotice = ({ classId, ClassNotice }) =>
  request.post('/api/teacher/class', { classId, ClassNotice })

// 学生端接收班级通知
export const fetchClassNotice = ({ ClassNotice }) =>
  request.get('/api/student/class', { ClassNotice })

export const StudentInfo = ({ ClassNotice }) => request.get('/api/get_students', { ClassNotice })

export const getStudentInfoByUsername = (username) => {
  return request.post('/api/student/getStudentInfo/', { username })
}

// 2025-12-02 批量导入：调用后端新接口写入 / 查询 student_bulk
export const bulkStudentImport = (students) => {
  return request.post('/api/student/bulk-import/', { students })
}

export const getBulkStudentInfo = (username) => {
  return request.get('/api/student/bulk-info/', {
    params: { username },
  })
}

// 2025-12-05 教师端学生列表：从 student_bulk 读取全部学生
export const fetchBulkStudentList = () => {
  return request.get('/api/student/bulk-list/')
}

// 2026-01-27 班级功能：教师端获取自己管理的班级列表
export const fetchTeacherClasses = () => {
  return request.get('/api/teacher/classes/')
}

// 2026-01-27 班级功能：教师端按班级查询学生名单及成绩
export const fetchTeacherClassStudentsScores = ({ class_id, class_name }) => {
  return request.get('/api/teacher/class-students-scores/', {
    params: {
      class_id,
      class_name,
    },
  })
}

// 2026-01-27 教师端学生管理：新增 / 编辑单个学生（student_bulk）
export const teacherUpdateBulkStudent = (payload) => {
  return request.post('/api/teacher/student-update/', payload)
}

// 2026-01-27 教师端学生管理：删除单个 / 多个学生（student_bulk）
export const teacherDeleteBulkStudents = (studentIds) => {
  return request.post('/api/teacher/student-delete/', {
    studentIds,
  })
}

// 2026-01-27 学生端：查看所在班级同学成绩
export const getStudentClassScores = () => {
  return request.get('/api/student/class-scores/')
}

// 2026-03 师生私信：学生端查看 / 发送与班主任的消息
export const fetchStudentMessages = () => {
  return request.get('/api/student/messages/')
}

export const sendStudentMessage = (content) => {
  return request.post('/api/student/messages/', { content })
}

// 2026-03 师生私信：教师端会话列表与消息
export const fetchTeacherMessageThreads = () => {
  return request.get('/api/teacher/message-threads/')
}

export const fetchTeacherMessages = (studentId) => {
  return request.get('/api/teacher/messages/', {
    params: { studentId },
  })
}

export const sendTeacherMessage = ({ studentId, content }) => {
  return request.post('/api/teacher/messages/', { studentId, content })
}

//开摄像头仰卧起坐
export const start_monitor_situp = (username) => {
  console.log('API调用: start_monitor_situp, username:', username)
  console.log('发送请求数据:', { username })
  return request.post(`/api/script/start/`, { username })
}
//关摄像头仰卧起坐
export const stop_monitor_situp = () => {
  return request.get(`/api/script/stop/`)
}
//请求当前时刻的数据仰卧起坐
export const latest_data_situp = ({ username }) => {
  return request.get('/api/latest_data/', {
    params: { username }
  })
}

//开摄像头引体向上
export const start_monitor_pullup = (username) => {
  return request.get(`/api/pullup/start/`, {
    params: { username },
  })
}
//关摄像头引体向上
export const stop_monitor_pullup = () => {
  return request.get(`/api/pullup/stop/`)
}
//请求当前时刻的数据引体向上
export const latest_data_pullup = ({ username }) => {
  return request.get('/api/pullup/latest_data/', {
    params: { username }
  })
}

export const open_latest_report = () => {
  return request.get(`/api/open_latest_report/`)
}

export const generaet_latest_report = ({ username }) => {
  console.log(username)
  return request.post(`/api/gen_pdf/`, { username }, { responseType: 'blob' })
}

// 仰卧起坐单项报告
export const generate_situp_report = ({ username }) => {
  return request.post(`/api/gen_situp_pdf/`, { username }, { responseType: 'blob' })
}

// 引体向上单项报告
export const generate_pullup_report = ({ username }) => {
  return request.post(`/api/gen_pullup_pdf/`, { username }, { responseType: 'blob' })
}

export const get_img = () => {
  return request.get(`/api/get_img/`, { responseType: 'blob' })
}

/*
export const heartbeat = async () => {
  const token = getAccess()
  if (!token) {
    return Promise.reject(new Error('Missing access token'))
  }
  try {
    const resp = await request.post(`${authBaseURL}/introspect/`, { token })
    const data = resp.data
    if (!data?.active || data?.revoked) {
      const err = new Error(data?.reason || 'token invalid or revoked')
      err.response = { data, status: 401 }
      throw err
    }
    return resp
  } catch (err) {
    // 尝试用 refresh 刷新一次后再重试心跳
    const refresh = getRefresh()
    if (!refresh) {
      clearAuth()
      throw err
    }
    try {
      const refreshResp = await request.post(`${baseURL}api/token/refresh/`, { refresh })
      const newAccess = refreshResp.data.access
      setAccess(newAccess)
      return request.post(`${authBaseURL}/introspect/`, { token: newAccess })
    } catch (refreshErr) {
      clearAuth()
      throw refreshErr
    }
  }
}
*/

// 2025-12-20 成绩分析：按 username 查询 testrecord 表中的成绩历史记录
export const getStudentScoreHistory = (username) => {
  return request.get('/api/student/score-history/', {
    params: { username },
  })
}

// 2026-01-08 视频下载：按 username + itemid 通过后端代理接口获取“最佳”测试视频的二进制流
export const downloadStudentBestVideo = ({ username, itemid }) => {
  return request.get('/api/student/score-video/', {
    params: { username, itemid },
    responseType: 'blob',
  })
}
// ==================== 管理员端接口 ====================

// 班级管理
export const adminGetClassList = () => {
  return request.get('/api/admin/class-list/')
}

export const adminCreateClass = (className, remark, teacherId) => {
  return request.post('/api/admin/class-create/', { className, remark, teacherId })
}

export const adminUpdateClass = (classId, className, remark, teacherId) => {
  return request.put('/api/admin/class-update/', { classId, className, remark, teacherId })
}

export const adminDeleteClass = (classId) => {
  return request.delete('/api/admin/class-delete/', { params: { classId } })
}

// 批量导入用户
export const adminBulkImport = (userType, users) => {
  return request.post('/api/admin/bulk-import/', { userType, users })
}

// 学生管理
export const adminGetStudentList = () => {
  return request.get('/api/admin/student-list/')
}

export const adminGetTeacherList = () => {
  return request.get('/api/admin/teacher-list/')
}

export const adminDeleteStudents = (studentIds) => {
  return request.post('/api/admin/students-delete/', { studentIds })
}

// 成绩管理
export const adminGetStudentScores = (studentId) => {
  return request.get('/api/admin/student-scores/', { params: { studentId } })
}

export const adminAddScore = (studentId, itemName, score) => {
  return request.post('/api/admin/score-add/', { studentId, itemName, score })
}

export const adminUpdateScore = (testid, score) => {
  return request.put('/api/admin/score-update/', { testid, score })
}

export const adminDeleteScore = (testid) => {
  return request.delete('/api/admin/score-delete/', { params: { testid } })
}
