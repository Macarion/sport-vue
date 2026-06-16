<template>
  <!-- 空模板，不渲染任何内容 -->
</template>

<script>
import axios from 'axios';
import { baseURL} from '@/utils/request'

const instance = axios.create({
  baseURL: baseURL,// 明确指定后端地址
  timeout: 10000,
});

export default {
  name: 'SetupTOTP',
  data() {
    return {
      tempToken: null,
    };
  },
  methods: {
    async loadQRCode(tempToken) {
      try {
        this.tempToken = tempToken;
        console.log('Loading QR code with tempToken:', this.tempToken);
        console.log('baseURL:',baseURL);
        const response = await instance.get('/api/totp/setup_info/', {
          headers: {
            Authorization: `Bearer ${this.tempToken}`,
          },
        });
        console.log('QR code loaded:', response.data.qr_code_url);
        this.$emit('update:qrCodeUrl', response.data.qr_code_url);
      } catch (error) {
        this.$message.error('加载二维码失败，请重试');
        console.error(error);
      }
    },
    async submitSetup(totpCode) {
      if (!totpCode) {
        this.$message.error('验证码不能为空');
        return;
      }
      try {
        await instance.post('/api/totp/setup/', {
          temp_token: this.tempToken,
          code: totpCode,
          headers: {
            Authorization: `Bearer ${this.tempToken}`,   // 注意这里的Authorization头部需要带上临时token
        }
        });
        this.$emit('success');
      } catch (error) {
        throw error; // 让父组件处理错误
      }
    },
    closeDialog() {
      this.tempToken = null;
      this.$emit('close');
    },
  },
};
</script>
