<template>
  <div class="forbidden">
    <div class="icon-wrap" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    </div>
    <h1>无访问权限</h1>
    <p>当前账号未被授予访问该页面的权限。如需开通，请联系系统管理员。</p>
    <button type="button" class="back" @click="goBack">返回上一页</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<style scoped>
.forbidden {
  max-width: 440px;
  margin: 48px auto;
  padding: 32px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  text-align: center;
}
.icon-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 12px;
  background: #e8e0d0;
  border: 1px solid #cfc4b0;
  color: #92400e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.forbidden h1 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.forbidden p {
  margin: 0 0 24px;
  color: var(--text-secondary);
  line-height: 1.65;
  font-size: 14px;
}
.back {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.back:hover {
  background: var(--bg-subtle);
  border-color: var(--border-strong);
}
</style>
