<template>
  <div class="user-info flex items-center p-3 border-t border-gray-100">
    <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
      <span class="text-indigo-600 font-medium">{{ userInitials }}</span>
    </div>
    <div class="flex-1">
      <div class="text-sm font-medium text-gray-700">{{ userName }}</div>
      <div class="text-xs text-gray-500">{{ userRole }}</div>
    </div>
    <button 
      class="text-gray-400 hover:text-gray-600 focus:outline-none"
      @click="handleSettingsClick"
    >
      <i class="pi pi-cog text-sm"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  userName: {
    type: String,
    default: 'John Smith'
  },
  userRole: {
    type: String,
    default: 'Designer'
  }
});

// 计算用户名称的首字母
const userInitials = computed(() => {
  if (!props.userName) return '?';
  
  const parts = props.userName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  
  return props.userName.substring(0, 2).toUpperCase();
});

// 处理设置按钮点击
const handleSettingsClick = () => {
  console.log('设置按钮点击');
  // 这里可以添加设置相关的逻辑，例如打开设置对话框
};
</script>

<style scoped>
.user-info {
  min-height: 64px;
}
</style> 