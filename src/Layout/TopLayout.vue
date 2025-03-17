<template>
    <!-- 顶部标题栏 -->
    <div class="flex items-center p-4 border-b">
      <div class="flex items-center ml-auto space-x-1">
        <button class="p-1 text-gray-500 hover:text-gray-700">
          <i class="pi pi-envelope text-sm"></i>
        </button>
        <button class="p-1 text-gray-500 hover:text-gray-700 relative">
          <i class="pi pi-bell text-sm"></i>
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">1</span>
        </button>
        <button class="p-1 text-gray-500 hover:text-gray-700">
          <i class="pi pi-cog text-sm"></i>
        </button>
        <button class="p-1 text-gray-500 hover:text-gray-700">
          <i class="pi pi-user text-sm"></i>
        </button>
        <button class="p-1 text-gray-500 hover:text-gray-700">
          <i class="pi pi-pencil text-sm"></i>
        </button>
      </div>
    </div>
</template>
    
<script setup lang='ts'>
    
</script>
    
<style>
    
</style>