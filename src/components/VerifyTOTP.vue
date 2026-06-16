<template>
  <!-- 空模板，不渲染任何内容 -->
</template>

<script>
import { baseURL } from '@/utils/request';
import axios from 'axios';

export default {
  name: 'VerifyTOTP',
  data() {
    return {
      tempToken: null,
    };
  },
  methods: {
    async submitVerification(totpCode) {
      if (!totpCode) {
        this.$message.error('验证码不能为空');
        return;
      }
      try {
        const response = await axios.post('/api/totp/verify/', {
          baseURL: baseURL,
          temp_token: this.tempToken,
          code: totpCode,
        });
        this.$emit('success', {
          access: response.data.access,
          refresh: response.data.refresh,
        });
      } catch (error) {
        throw error; // 让父组件处理错误
      }
    },
    openVerificationDialog(tempToken) {
      this.tempToken = tempToken;
      this.$emit('close'); // 触发关闭事件以重置状态
    },
    closeVerificationDialog() {
      this.tempToken = null;
      this.$emit('close');
    },
  },
};
</script>

