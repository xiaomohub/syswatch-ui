<template>
  <div class="container">
    <el-card class="box">
      <h2>SysWatch Login</h2>
      <el-input v-model="username" placeholder="Username" />
      <el-input v-model="password" placeholder="Password" type="password" />
      <el-button type="primary" @click="doLogin">Login</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/api/request'
import { useUserStore } from '@/store/user'
import router from '@/router'

const username = ref('')
const password = ref('')
const userStore = useUserStore()

const doLogin = async () => {
  const res = await request.post('/login', {
    username: username.value,
    password: password.value
  })
  userStore.setToken(res.token)
  router.push('/dashboard')
}
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #eef2f5;
}
.box {
  width: 300px;
}
</style>
