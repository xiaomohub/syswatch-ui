<template>
  <div class="login-page">
    <aside class="login-brand" aria-hidden="true">
      <div class="brand-inner">
        <div class="brand-mark">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 class="brand-title">SysWatch</h1>
        <p class="brand-lead">企业级监控与可观测性控制台</p>
        <ul class="brand-points">
          <li>统一告警与日志研判</li>
          <li>RBAC 权限与审计就绪</li>
          <li>智能诊断：根因分析与日志巡检</li>
        </ul>
      </div>
    </aside>

    <main class="login-main">
      <div class="login-card">
        <header class="card-header">
          <h2>登录</h2>
          <p>使用企业账号访问控制台</p>
        </header>

        <form @submit.prevent="doLogin">
          <label class="field">
            <span class="label">用户名</span>
            <input v-model="username" type="text" autocomplete="username" placeholder="请输入用户名" required />
          </label>

          <label class="field">
            <span class="label">密码</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              required
            />
          </label>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" class="submit" :disabled="loading">
            {{ loading ? '登录中…' : '登 录' }}
          </button>
        </form>
      </div>
      <p class="login-foot">© SysWatch · 仅供授权人员使用</p>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import http from '@/utils/http'
import { useUserStore } from '@/store/user'
import { defaultHomePath } from '@/constants/rbac'
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
    const res = await http.post('/api/auth/login', {
      username: username.value,
      password: password.value
    })
    const data = res.data || {}
    const token = data.token
    if (!token) {
      error.value = '登录响应缺少 token'
      return
    }
    const permissionsOmitted = !Object.prototype.hasOwnProperty.call(data, 'permissions')
    userStore.setSession({
      token,
      user: data.user,
      permissions: data.permissions,
      permissionsOmitted
    })
    const redirect = router.currentRoute.value.query.redirect
    const target =
      typeof redirect === 'string' && redirect ? redirect : defaultHomePath(userStore.hasPermission)
    router.push(target)
  } catch (e) {
    error.value = e.response?.data?.message || e.response?.data || e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: var(--bg-page);
}

.login-brand {
  display: none;
  width: 42%;
  min-height: 100vh;
  background: linear-gradient(165deg, #0f172a 0%, #1e3a8a 42%, #0c1222 100%);
  color: #fff;
  padding: 48px 56px;
  flex-direction: column;
  justify-content: center;
}

@media (min-width: 900px) {
  .login-brand {
    display: flex;
  }
}

.brand-inner {
  max-width: 400px;
}

.brand-mark {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.brand-title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.brand-lead {
  margin: 12px 0 32px;
  font-size: 15px;
  line-height: 1.6;
  opacity: 0.88;
  font-weight: 400;
}

.brand-points {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 2;
  opacity: 0.85;
}

.login-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 24px;
  background: var(--bg-page);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 36px 36px 32px;
  box-shadow: var(--shadow-md);
}

.card-header {
  margin-bottom: 28px;
}

.card-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary, #111827);
  letter-spacing: -0.02em;
}

.card-header p {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-muted, #6b7280);
}

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #4b5563);
}

.field input {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
  background: var(--bg-subtle);
  color: var(--text-primary);
}

.field input:hover {
  border-color: var(--border-strong);
}

.field input:focus {
  border-color: var(--brand-600);
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.18);
  background: var(--bg-surface);
}

.error {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--danger-700, #b91c1c);
  background: var(--danger-50, #fef2f2);
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.submit {
  margin-top: 4px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--brand-600, #2563eb);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  font-family: inherit;
}

.submit:hover:not(:disabled) {
  background: var(--brand-700, #1d4ed8);
}

.submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-foot {
  margin-top: 28px;
  font-size: 12px;
  color: var(--text-muted, #6b7280);
}
</style>
