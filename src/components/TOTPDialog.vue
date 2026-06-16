<template>
  <div v-if="visible" class="dialog-overlay">
    <div class="dialog">
      <h3>双重验证</h3>
      <p>请从您的身份验证器应用中输入验证码</p>
      <input
        v-model="code"
        placeholder="输入6位验证码"
        type="tel"
        maxlength="6"
        @keyup.enter="submit"
      />
      <div class="dialog-actions">
        <button @click="submit">验证</button>
        <button @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      code: '',
      resolve: null
    }
  },
  methods: {
    open() {
      this.visible = true;
      this.code = '';
      return new Promise((resolve) => {
        this.resolve = resolve;
      });
    },
    submit() {
      if (this.code.length === 6) {
        this.visible = false;
        this.resolve(this.code);
      }
    },
    cancel() {
      this.visible = false;
      this.resolve(null);
    }
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin-top: 0;
  color: #333;
}

.dialog input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.dialog-actions button:first-child {
  background-color: #007bff;
  color: white;
}

.dialog-actions button:last-child {
  background-color: #6c757d;
  color: white;
}
</style>
