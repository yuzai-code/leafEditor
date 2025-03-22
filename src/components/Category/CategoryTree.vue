<template>
  <div class="category-tree">
    <!-- 分类列表 -->
    <div class="category-list">
      <div v-for="node in nodes" :key="node.id" :data-parent-id="node.id">
        <CategoryItem 
          :id="node.id"
          :label="node.label"
          :icon="node.icon"
          :has-children="!!node.children && node.children.length > 0"
          :expanded="!!node.expanded"
          :node-type="node.nodeType"
          @item-click="onItemClick"
          @show-context-menu="showContextMenu"
          @toggle-expand="onToggleExpand"
          @rename="onRenameCategory"
          :data-id="node.id"
          :ref="el => setCategoryItemRef(el, node.id)"
        />
        
        <!-- 递归渲染子节点 -->
        <div v-if="node.expanded" class="pl-4" :data-children-of="node.id">
          <!-- 已有子节点 -->
          <div v-if="node.children && node.children.length > 0">
            <CategoryTree 
              :nodes="node.children" 
              @item-click="onItemClick"
              @context-menu-action="handleContextMenuAction"
              @toggle-expand="onToggleExpand"
              @rename-category="onRenameCategory"
            />
          </div>
          
          <!-- 新分类输入框 -->
          <div 
            v-if="isAddingChildTo[node.id]"
            class="new-category-item flex items-center p-2 px-4 rounded-md bg-indigo-50"
          >
            <div class="w-4 mr-1"></div>
            <div class="flex-1 flex items-center">
              <i class="pi pi-folder mr-2 text-indigo-500"></i>
              <input
                v-model="newCategoryName"
                class="text-gray-700 text-sm flex-1 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="输入分类名称..."
                @keyup.enter="saveNewCategory(node.id)"
                @keyup.esc="cancelAddCategory"
                @blur="handleNewCategoryInputBlur(node.id)"
                :ref="el => setInputRef(el as HTMLInputElement, node.id)"
                :disabled="isSaving"
                :id="`new-category-input-${node.id}`"
              />
              <div v-if="isSaving" class="ml-2">
                <i class="pi pi-spin pi-spinner text-indigo-500 text-xs"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 上下文菜单 -->
    <CategoryContextMenu 
      ref="contextMenuRef"
      :node="selectedNode"
      @create-note="(node) => emitContextMenuAction('create-note', node)"
      @create-category="startAddChild"
      @delete-category="(node) => emitContextMenuAction('delete-category', node)"
      @rename-category="startRenameCategory"
      @move-category="(node) => emitContextMenuAction('move-category', node)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, reactive, nextTick, watch } from 'vue';
import CategoryItem from './CategoryItem.vue';
import CategoryContextMenu from './CategoryContextMenu.vue';

// 定义树节点类型（与SidebarLayout中一致）
interface TreeNode {
  id: string;
  label: string;
  icon: string;
  expanded?: boolean;
  children?: TreeNode[];
  selected?: boolean;
  nodeType: 'category' | 'note' | 'system';
}

// 上下文菜单节点类型
interface ContextMenuNode {
  id: string;
  label: string;
  nodeType: string;
  target: Event | null;
  hasChildren?: boolean;
}

// 重命名类型
interface RenameData {
  id: string;
  newName: string;
  oldName: string;
  callback: (success: boolean) => void;
}

// 声明输入框ref数组
interface InputRefs {
  [key: string]: HTMLInputElement | null;
}
const inputRefs = ref<InputRefs>({});

// 存储CategoryItem组件实例的ref数组
interface CategoryItemRefs {
  [key: string]: any;
}
const categoryItemRefs = ref<CategoryItemRefs>({});

// 设置CategoryItem组件ref
const setCategoryItemRef = (el: any, id: string) => {
  if (el) {
    categoryItemRefs.value[id] = el;
  }
};

// 设置输入框ref
const setInputRef = (el: HTMLInputElement | null, parentId: string) => {
  if (el) {
    inputRefs.value[parentId] = el;
    // 立即聚焦
    el.focus();
    el.select();
    console.log('输入框ref设置成功，立即聚焦:', parentId);
  }
};

defineProps({
  nodes: {
    type: Array as () => TreeNode[],
    required: true,
    default: () => []
  }
});

const emit = defineEmits([
  'item-click',
  'context-menu-action',
  'toggle-expand',
  'rename-category'
]);

const contextMenuRef = ref<InstanceType<typeof CategoryContextMenu> | null>(null);
const selectedNode = ref<ContextMenuNode>({
  id: '',
  label: '',
  nodeType: 'category',
  target: null
});

// 新增分类相关状态
const isAddingChildTo = reactive<Record<string, boolean>>({});
const newCategoryName = ref('');
const isSaving = ref(false);

// 用于跟踪当前正在编辑的父分类ID
const currentEditingParentId = ref<string>('');

// 监视isAddingChildTo的变化，以便在DOM更新后聚焦输入框
watch(isAddingChildTo, async (newValue, oldValue) => {
  // 找出新添加的分类ID
  const newlyAddedIds = Object.keys(newValue).filter(id => 
    newValue[id] && (!oldValue[id] || !oldValue[id])
  );
  
  if (newlyAddedIds.length > 0) {
    const lastAddedId = newlyAddedIds[newlyAddedIds.length - 1];
    console.log('监测到新增状态变化，将尝试聚焦:', lastAddedId);
    // 使用专门的聚焦函数
    focusNewCategoryInput(lastAddedId);
  }
}, { deep: true });

// 处理项点击
const onItemClick = (node: {id: string; label: string; nodeType: string}) => {
  // 仅发送项目点击事件，折叠/展开由 CategoryItem 通过 toggle-expand 事件处理
  emit('item-click', node);
};

// 处理展开/折叠切换
const onToggleExpand = (data: {id: string; expanded: boolean}) => {
  // 向上传递展开/折叠事件
  emit('toggle-expand', data);
};

// 显示上下文菜单
const showContextMenu = (node: ContextMenuNode) => {
  selectedNode.value = node;
  if (contextMenuRef.value && node.target) {
    contextMenuRef.value.show(node.target);
  }
};

// 处理上下文菜单操作
const handleContextMenuAction = (
  action: string | { action: string; node: ContextMenuNode }, 
  node?: ContextMenuNode
) => {
  // 检查action是否已经是完整的对象结构（从子组件接收）
  if (typeof action === 'object' && action.action) {
    // 直接转发已经格式化好的事件对象
    emit('context-menu-action', action);
  } else {
    // 直接从当前组件发起的事件
    emit('context-menu-action', { action: action as string, node: node as ContextMenuNode });
  }
};

// 转发上下文菜单事件
const emitContextMenuAction = (action: string, node: ContextMenuNode) => {
  emit('context-menu-action', { action, node });
};

// 开始重命名分类
const startRenameCategory = (node: ContextMenuNode) => {
  // 尝试通过ref调用CategoryItem组件的startEdit方法
  const itemRef = categoryItemRefs.value[node.id];
  if (itemRef) {
    // 直接调用组件的startEdit方法
    itemRef.startEdit();
    console.log('启动重命名模式：直接调用组件方法');
  } else {
    // 备用方案：通过上下文菜单事件发送到上层组件处理
    console.log('找不到组件实例，通过事件处理重命名');
    emit('context-menu-action', { action: 'rename-category', node });
  }
};

// 处理来自 CategoryItem 的重命名事件
const onRenameCategory = (data: RenameData) => {
  // 向上传递重命名事件
  emit('rename-category', data);
};

// 开始添加子分类
const startAddChild = (node: ContextMenuNode) => {
  // 获取父分类ID
  const parentId = node.id;
  
  // 自动展开父分类
  if (!node.hasChildren) {
    emit('toggle-expand', {
      id: parentId,
      expanded: true
    });
  }
  
  // 设置正在添加的父分类ID
  isAddingChildTo[parentId] = true;
  
  // 设置默认名称 - 根据父节点ID获取该节点下的同级分类名称进行递增
  newCategoryName.value = generateDefaultCategoryName(parentId);
  
  // 记录正在编辑的父分类ID，以便后续使用
  currentEditingParentId.value = parentId;
  
  // 确保DOM更新后聚焦输入框
  focusNewCategoryInput(parentId);
};

// 聚焦新分类输入框
const focusNewCategoryInput = (parentId: string) => {
  // 首先检查是否有引用存在
  if (inputRefs.value[parentId]) {
    console.log('通过ref聚焦输入框，父ID:', parentId);
    inputRefs.value[parentId]?.focus();
    inputRefs.value[parentId]?.select();
    return;
  }
  
  // 备用方案：使用多个nextTick和延时，确保DOM完全更新后再聚焦
  nextTick(() => {
    console.log('尝试聚焦输入框，父ID:', parentId);
    
    // 第一次尝试直接通过ID查找
    let inputElement = document.getElementById(`new-category-input-${parentId}`) as HTMLInputElement;
    
    if (inputElement) {
      console.log('找到输入框，立即聚焦');
      inputElement.focus();
      inputElement.select();
    } else {
      // 如果没找到，再等一会儿尝试，给DOM更多时间更新
      setTimeout(() => {
        console.log('第二次尝试聚焦输入框');
        inputElement = document.getElementById(`new-category-input-${parentId}`) as HTMLInputElement;
        
        if (inputElement) {
          console.log('找到输入框，聚焦成功');
          inputElement.focus();
          inputElement.select();
        } else {
          // 最后一次尝试，使用querySelector
          console.log('尝试使用querySelector查找输入框');
          const containerSelector = `[data-children-of="${parentId}"]`;
          const container = document.querySelector(containerSelector);
          
          if (container) {
            const input = container.querySelector('input');
            if (input) {
              console.log('通过容器找到输入框，聚焦成功');
              input.focus();
              input.select();
            } else {
              console.error('无法找到输入框元素');
            }
          } else {
            console.error('无法找到容器元素');
          }
        }
      }, 50);
    }
  });
};

// 生成默认分类名称 - 根据父分类ID生成递增名称
const generateDefaultCategoryName = (parentId?: string): string => {
  // 基本名称
  const baseName = '新增分类';
  const siblingNames: string[] = [];
  let maxSuffix = 0;
  
  // 从当前节点的子节点中提取已有分类名称
  if (parentId) {
    // 根据父节点ID获取其子节点区域
    const childrenContainer = document.querySelector(`[data-children-of="${parentId}"]`);
    if (childrenContainer) {
      // 获取子节点区域中的分类名称
      const childCategories = childrenContainer.querySelectorAll('.category-item .text-gray-700.text-sm');
      if (childCategories.length === 0) {
        // 如果没有子节点，直接返回基本名称
        return baseName;
      }
      
      childCategories.forEach(child => {
        if (child.textContent) {
          siblingNames.push(child.textContent.trim());
        }
      });
    } else {
      // 如果找不到子节点容器，直接返回基本名称
      return baseName;
    }
  } else {
    // 获取根级分类名称
    const rootCategories = document.querySelectorAll('.category-tree > .category-list > div > .category-item .text-gray-700.text-sm');
    rootCategories.forEach(category => {
      if (category.textContent) {
        siblingNames.push(category.textContent.trim());
      }
    });
  }
  
  // 如果没有找到分类，或者基本名称不存在，直接返回基本名称
  if (siblingNames.length === 0 || !siblingNames.includes(baseName)) {
    return baseName;
  }
  
  // 否则，查找最大后缀并递增
  siblingNames.forEach(name => {
    if (name.startsWith(baseName)) {
      const suffixMatch = name.substring(baseName.length).match(/^(\d+)$/);
      if (suffixMatch) {
        const suffix = parseInt(suffixMatch[1], 10);
        if (suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }
  });
  
  return `${baseName}${maxSuffix + 1}`;
};

// 保存新分类
const saveNewCategory = (parentId: string) => {
  // 如果正在保存中，直接返回，避免重复保存
  if (isSaving.value) {
    return;
  }
  
  if (newCategoryName.value.trim() !== '') {
    // 设置保存中状态
    isSaving.value = true;
    
    // 创建子分类，使用不同的ID和parentId标识
    const tempId = 'temp-' + Math.random().toString(36).substring(2, 9);
    
    // 发送创建分类事件
    emit('context-menu-action', { 
      action: 'create-category', 
      node: {
        id: tempId, // 使用临时ID避免与parentId混淆
        label: newCategoryName.value.trim(),
        nodeType: 'category',
        target: null,
        isNewCategory: true,
        parentId: parentId, // 明确传递父ID
        callback: (success: boolean) => {
          isSaving.value = false;
          if (success) {
            // 创建成功，重置状态
            newCategoryName.value = '';
            isAddingChildTo[parentId] = false;
            currentEditingParentId.value = ''; // 重置当前编辑的父分类ID
          }
        }
      }
    });
  } else {
    // 输入为空，取消添加
    cancelAddCategory();
  }
};

// 取消添加分类
const cancelAddCategory = () => {
  if (!isSaving.value) {
    // 重置所有正在添加的状态
    Object.keys(isAddingChildTo).forEach(key => {
      isAddingChildTo[key] = false;
    });
    newCategoryName.value = '';
    currentEditingParentId.value = ''; // 重置当前编辑的父分类ID
  }
};

// 处理新分类输入框的blur事件
const handleNewCategoryInputBlur = (parentId: string) => {
  // 如果已经在保存中，直接返回，避免重复保存
  if (isSaving.value) {
    return;
  }
  
  // 设置延时，避免与其他点击事件冲突，如点击上下文菜单
  setTimeout(() => {
    // 确保当前活动元素不是同一个输入框
    const activeElement = document.activeElement as HTMLElement;
    const inputElement = document.getElementById(`new-category-input-${parentId}`) as HTMLInputElement;
    
    if (activeElement !== inputElement && isAddingChildTo[parentId]) {
      console.log('输入框失焦，保存分类:', parentId, newCategoryName.value);
      // 调用保存函数，确保点击输入框外自动保存
      saveNewCategory(parentId);
    }
  }, 200);
};
</script>

<style scoped>
.category-list {
  padding: 0.25rem 0;
}

/* 添加data-parent-id标识，便于CSS选择器定位 */
:deep(.category-item[data-id]) + div {
  position: relative;
}
:deep(.category-item[data-id]) + div::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style> 