<template>
  <div class="sidebar-container flex flex-col h-full bg-cream-50">
    <!-- 侧边栏标题 -->
    <div class="flex items-center px-4 py-2 mb-2">
      <div class="flex items-center">
        <div class="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded mr-2">
          <span class="font-bold text-sm">K</span>
        </div>
        <span class="font-medium text-gray-700">知识库</span>
      </div>
    </div>

    <!-- 侧边栏内容区域 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 系统导航 -->
      <SystemNavigation class="mb-3" />

      <!-- 分类部分 -->
      <CategoryManager class="mb-3" />
    </div>
    
    <!-- 用户信息 -->
    <UserInfo />
  </div>
</template>

<script setup lang="ts">
import SystemNavigation from '../components/SystemNavigation.vue';
import CategoryManager from '../components/Category/CategoryManager.vue';
import UserInfo from '../components/UserInfo.vue';
</script>

<style scoped>
/* 确保 sidebar-container 有明确的宽度和定位上下文 */
.sidebar-container {
  position: relative;
  width: 100%;
  border-right: 1px solid #e5e7eb;
  background-color: #fffefb;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 8px;
}

::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
