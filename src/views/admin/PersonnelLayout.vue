<template>
  <div class="personnel-layout">
    <nav class="personnel-tabs" aria-label="人员管理">
      <router-link
        class="personnel-tab"
        active-class="personnel-tab-active"
        :to="{ name: 'PersonnelUsers' }"
      >
        用户列表
      </router-link>
      <router-link
        class="personnel-tab"
        active-class="personnel-tab-active"
        :to="{ name: 'PersonnelRoles' }"
      >
        角色与权限
      </router-link>
    </nav>
    <div class="personnel-body">
      <router-view />
    </div>
  </div>
</template>

<script setup>
// 人员管理：用户 CRUD + 角色权限（子路由）
</script>

<style scoped>
.personnel-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: min(1200px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
}
.personnel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, var(--border-default));
  padding-bottom: 2px;
}
.personnel-tab {
  padding: 10px 16px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  border: 1px solid transparent;
  margin-bottom: -1px;
}
.personnel-tab:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
}
.personnel-tab-active {
  color: var(--text-primary);
  background: var(--bg-card);
  border-color: var(--border-color, var(--border-default));
  border-bottom-color: var(--bg-card);
}
.personnel-body {
  min-height: 200px;
}
</style>
