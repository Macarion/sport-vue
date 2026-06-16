import { defineStore } from 'pinia';

export const useSecurityStore = defineStore('security', {
  state: () => ({
    totpDialogRef: null, // 存储对话框组件引用
    pendingRequest: null, // 存储待处理的请求配置
    totpCode: '' // 存储用户输入的TOTP码
  }),

  actions: {
    // 设置对话框组件引用
    setTotpDialogRef(ref) {
      this.totpDialogRef = ref;
    },

    // 打开TOTP对话框并返回Promise
    async openTotpDialog() {
      if (this.totpDialogRef) {
        return this.totpDialogRef.open();
      }
      return null;
    },

    // 设置待处理的请求
    setPendingRequest(config) {
      this.pendingRequest = config;
    },

    // 获取并清除待处理的请求
    getPendingRequest() {
      const request = this.pendingRequest;
      this.pendingRequest = null;
      return request;
    },

    // 设置TOTP代码
    setTotpCode(code) {
      this.totpCode = code;
    }
  }
});
