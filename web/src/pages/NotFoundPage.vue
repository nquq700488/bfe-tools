<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="page-container py-24 text-center">
    <h1 class="text-[72px] sm:text-[96px] font-bold text-neutral-900 tracking-tight leading-none">
      404
    </h1>
    <p class="text-base text-neutral-500 mt-4 mb-2">
      页面不存在
    </p>
    <p class="text-sm text-neutral-400 mb-8">
      页面可能已移动，或是地址输入有误
    </p>
    <button class="btn btn-primary h-10 px-5 text-sm" @click="router.push({ name: 'home' })">
      返回首页
    </button>
  </section>
</template>
