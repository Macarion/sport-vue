import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userGetInfoService } from '../../api/user'

// 用户认证模块 token setToken removeToken
export const useUserStore = defineStore(
  'big-user',
  () => {
    const user = ref({})
    const getUser = async () => {
      const res = await userGetInfoService()
      user.value = res.data.data
    }
    const setUser = (obj) => {
      user.value = obj
    }

    return {
      user,
      getUser,
      setUser,
    }
  },
  {
    persist: true, // 你也可以取消这一行，如果不想保存 user 数据
  },
)
