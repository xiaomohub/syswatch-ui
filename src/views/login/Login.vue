<template>
  <div class="login-page">
    <div class="login-card">
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1>SysWatch</h1>
        <p>系统监控平台</p>
      </div>

      <form @submit.prevent="doLogin">
        <div class="input-field">
          <input 
            v-model="username" 
            type="text" 
            placeholder="用户名"
            required
          />
        </div>

        <div class="input-field">
          <input 
            v-model="password" 
            type="password" 
            placeholder="密码"
            required
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/api/request'
import { useUserStore } from '@/store/user'
import router from '@/router'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const userStore = useUserStore()

const doLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const token = await request.post('/auth/login', {
      username: username.value,
      password: password.value
    })
    userStore.setToken(token)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data || e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.login-card {
  width: 360px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: #2563eb;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
}

.header p {
  margin: 8px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-field input {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.input-field input:focus {
  border-color: #2563eb;
}

.error {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 6px;
}

button {
  padding: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #1d4ed8;
}

button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}
</style>