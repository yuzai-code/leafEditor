<template>
  <div 
    class="category-item flex items-center p-2 px-4 hover:bg-gray-50 cursor-pointer rounded-md relative"
    @mouseenter="showMoreButton = true"
    @mouseleave="showMoreButton = false"
    :data-id="id"
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
    
    <!-- 分类图标和标签 - 编辑模式 -->
    <div v-if="isEditing" class="flex-1 flex items-center">
      <i :class="['pi', `${icon}`, 'mr-2 text-gray-500']"></i>
      <input
        v-model="editingLabel"
        class="text-gray-700 text-sm flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
        @keyup.enter="saveEdit"
        @keyup.esc="cancelEdit"
        @blur="handleInputBlur"
        ref="editInputRef"
        :disabled="isSaving"
      />
      <div v-if="isSaving" class="ml-2">
        <i class="pi pi-spin pi-spinner text-gray-400 text-xs"></i>
      </div>
    </div>
    
    <!-- 分类图标和标签 - 正常模式 -->
    <div v-else class="flex-1 flex items-center" @click.stop="handleItemClick">
      <i :class="['pi', `${icon}`, 'mr-2 text-gray-500']"></i>
      <span class="text-gray-700 text-sm truncate">{{ label }}</span>
    </div>
    
    <!-- 更多操作按钮 -->
    <button 
      v-if="showMoreButton && !isEditing && !isSaving"
      class="more-button text-gray-400 hover:text-gray-600 focus:outline-none"
      @click.stop="toggleMenu"
      ref="menuToggleButton"
    >
      <i class="pi pi-ellipsis-h text-xs"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, nextTick, watch } from 'vue';

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
  'toggle-expand',
  'rename',
]);

const showMoreButton = ref(false);
const menuToggleButton = ref<HTMLElement | null>(null);
const isEditing = ref(false);
const editingLabel = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);
const isSaving = ref(false);

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

// 开始编辑模式 - 由上下文菜单调用，不再通过双击触发
const startEdit = () => {
  editingLabel.value = props.label;
  isEditing.value = true;
  
  // 在下一个 DOM 更新周期聚焦输入框
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus();
      editInputRef.value.select();
    }
  });
};

// 保存编辑
const saveEdit = () => {
  // 如果正在保存中或者不在编辑模式，直接返回
  if (isSaving.value || !isEditing.value) {
    return;
  }
  
  if (editingLabel.value.trim() !== '') {
    // 只有当名称有变化时才发送重命名事件
    if (editingLabel.value.trim() !== props.label) {
      // 显示保存中状态
      isSaving.value = true;
      
      emit('rename', {
        id: props.id,
        newName: editingLabel.value.trim(),
        oldName: props.label,
        callback: (success: boolean) => {
          isSaving.value = false;
          if (success) {
            isEditing.value = false;
          }
        }
      });
    } else {
      // 没有变化，直接结束编辑
      isEditing.value = false;
    }
  } else {
    // 输入为空或取消编辑
    cancelEdit();
  }
};

// 取消编辑
const cancelEdit = () => {
  if (!isSaving.value) {
    isEditing.value = false;
    editingLabel.value = props.label;
  }
};

// 监听外部 label 属性变化
watch(() => props.label, (newValue) => {
  if (!isEditing.value) {
    editingLabel.value = newValue;
  }
});

// 处理输入框的blur事件
const handleInputBlur = () => {
  // 如果已经在保存中，直接返回，避免重复操作
  if (isSaving.value) {
    return;
  }
  
  // 调用saveEdit进行保存操作
  saveEdit();
};

// 暴露方法给父组件调用
defineExpose({
  startEdit
});
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