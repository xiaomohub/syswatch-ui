<template>
  <div class="forbidden">
    <h1>无访问权限</h1>
    <p>当前账号未被授予访问该页面的权限。如需开通，请联系管理员。</p>
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
  max-width: 480px;
  margin: 48px auto;
  padding: 24px;
  background: var(--bg-card, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  color: var(--text-primary, #f8fafc);
}
.forbidden h1 {
  margin: 0 0 12px;
  font-size: 20px;
}
.forbidden p {
  margin: 0 0 20px;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.6;
}
.back {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #334155);
  background: var(--bg-tertiary, #334155);
  color: var(--accent-cyan, #22d3ee);
  font-size: 14px;
  cursor: pointer;
}
.back:hover {
  border-color: var(--accent-cyan, #22d3ee);
}
</style>
