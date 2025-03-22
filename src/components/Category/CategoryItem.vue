<template>
  <div 
    class="category-item flex items-center p-2 px-4 hover:bg-gray-50 cursor-pointer rounded-md relative"
    @mouseenter="showMoreButton = true"
    @mouseleave="showMoreButton = false"
  >
    <!-- 分类前的展开/折叠图标，仅当有子项时显示 -->
    <div 
      v-if="hasChildren" 
      class="expand-icon w-4 flex justify-center mr-1"
      @click.stop="toggleExpand"
    >
      <i :class="['pi', expanded ? 'pi-chevron-down' : 'pi-chevron-right', 'text-xs text-gray-400']"></i>
    </div>
    <div v-else class="w-4 mr-1"></div>
    
    <!-- 分类图标和标签 -->
    <div class="flex-1 flex items-center" @click.stop="handleItemClick">
      <i :class="['pi', `${icon}`, 'mr-2 text-gray-500']"></i>
      <span class="text-gray-700 text-sm truncate">{{ label }}</span>
    </div>
    
    <!-- 更多操作按钮 -->
    <button 
      v-if="showMoreButton"
      class="more-button text-gray-400 hover:text-gray-600 focus:outline-none"
      @click.stop="toggleMenu"
      ref="menuToggleButton"
    >
      <i class="pi pi-ellipsis-h text-xs"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'pi-folder'
  },
  hasChildren: {
    type: Boolean,
    default: false
  },
  expanded: {
    type: Boolean,
    default: false
  },
  nodeType: {
    type: String,
    default: 'category'
  }
});

const emit = defineEmits([
  'item-click', 
  'show-context-menu',
  'toggle-expand'
]);

const showMoreButton = ref(false);
const menuToggleButton = ref<HTMLElement | null>(null);

// 处理项点击
const handleItemClick = () => {
  // 发出项目点击事件
  emit('item-click', {
    id: props.id,
    label: props.label,
    nodeType: props.nodeType
  });
  
  // 如果有子项，同时触发展开/折叠
  if (props.hasChildren) {
    toggleExpand();
  }
};

// 切换展开/折叠状态
const toggleExpand = () => {
  emit('toggle-expand', {
    id: props.id,
    expanded: !props.expanded
  });
};

// 显示上下文菜单
const toggleMenu = (event: MouseEvent) => {
  emit('show-context-menu', {
    id: props.id,
    label: props.label,
    nodeType: props.nodeType,
    target: event,
    hasChildren: props.hasChildren
  });
};
</script>

<style scoped>
.category-item {
  transition: background-color 0.2s ease;
}

.more-button {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-icon {
  cursor: pointer;
}
</style> 