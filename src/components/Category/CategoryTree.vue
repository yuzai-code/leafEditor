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
          
          <!-- 新笔记输入框 -->
          <div 
            v-if="isAddingNoteTo[node.id]"
            class="new-note-item flex items-center p-2 px-4 rounded-md bg-blue-50"
          >
            <div class="w-4 mr-1"></div>
            <div class="flex-1 flex items-center">
              <i class="pi pi-file mr-2 text-blue-500"></i>
              <input
                v-model="newNoteName"
                class="note-input text-gray-700 text-sm flex-1 border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="输入笔记标题..."
                @keyup.enter="saveNewNote(node.id)"
                @keyup.esc="cancelAddNote"
                @blur="handleNewNoteInputBlur(node.id)"
                :ref="el => setNoteInputRef(el as HTMLInputElement, node.id)"
                :disabled="isSavingNote"
                :id="`new-note-input-${node.id}`"
                autofocus
              />
              <div v-if="isSavingNote" class="ml-2">
                <i class="pi pi-spin pi-spinner text-blue-500 text-xs"></i>
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
      @create-note="startAddNote"
      @create-category="startAddChild"
      @delete-category="(node) => emitContextMenuAction('delete-category', node)"
      @rename-category="startRenameCategory"
      @move-category="(node) => emitContextMenuAction('move-category', node)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, reactive, nextTick, watch, onMounted } from 'vue';
import CategoryItem from './CategoryItem.vue';
import CategoryContextMenu from './CategoryContextMenu.vue';

// 在挂载时确保笔记输入框能够聚焦
onMounted(() => {
  console.log('组件挂载完成，将尝试聚焦新输入框');
  
  // 查找当前正在添加笔记的分类
  const activeNoteIds = Object.keys(isAddingNoteTo).filter(id => isAddingNoteTo[id]);
  if (activeNoteIds.length > 0) {
    activeNoteIds.forEach(id => {
      focusNewNoteInput(id);
    });
  }
});

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
  parentId?: string;
  isNewNote?: boolean;
  callback?: (success: boolean) => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // 使用any是因为组件实例类型很复杂，难以精确定义
}
const categoryItemRefs = ref<CategoryItemRefs>({});

// 设置CategoryItem组件ref
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setCategoryItemRef = (el: any, id: string) => {
  if (el) {
    categoryItemRefs.value[id] = el;
  }
};

// 设置输入框ref
const setInputRef = (el: HTMLInputElement | null, parentId: string) => {
  if (!el) return;
  
  // 存储引用
  inputRefs.value[parentId] = el;
  
  // 设置焦点并移动光标到末尾
  setTimeout(() => {
    el.focus();
    
    // 移动光标到文本末尾
    const length = el.value.length;
    el.setSelectionRange(length, length);
  }, 50);
};

// 声明笔记输入框ref数组
interface NoteInputRefs {
  [key: string]: HTMLInputElement | null;
}
const noteInputRefs = ref<NoteInputRefs>({});

// 设置笔记输入框ref
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setNoteInputRef = (el: HTMLInputElement | null, nodeId: string) => {
  if (!el) return;
  
  // 存储引用
  noteInputRefs.value[nodeId] = el;
  
  // 设置焦点并移动光标到末尾
  setTimeout(() => {
    el.focus();
    
    // 移动光标到文本末尾
    const length = el.value.length;
    el.setSelectionRange(length, length);
  }, 50);
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

// 新增笔记相关状态
const isAddingNoteTo = reactive<Record<string, boolean>>({});
const newNoteName = ref('');
const isSavingNote = ref(false);

// 用于跟踪当前正在编辑的父分类ID
const currentEditingParentId = ref<string>('');

// 监视isAddingChildTo和isAddingNoteTo的变化，以便在DOM更新后聚焦输入框
watch([isAddingChildTo, isAddingNoteTo], async ([newCategoryValue, newNoteValue], [oldCategoryValue, oldNoteValue]) => {
  // 处理新增分类的情况
  const newlyAddedCategoryIds = Object.keys(newCategoryValue).filter(id => 
    newCategoryValue[id] && (!oldCategoryValue[id] || !oldCategoryValue[id])
  );
  
  if (newlyAddedCategoryIds.length > 0) {
    const lastAddedId = newlyAddedCategoryIds[newlyAddedCategoryIds.length - 1];
    console.log('监测到新增分类状态变化，将尝试聚焦:', lastAddedId);
    // 使用专门的聚焦函数
    focusNewCategoryInput(lastAddedId);
  }
  
  // 处理新增笔记的情况
  const newlyAddedNoteIds = Object.keys(newNoteValue).filter(id => 
    newNoteValue[id] && (!oldNoteValue[id] || !oldNoteValue[id])
  );
  
  if (newlyAddedNoteIds.length > 0) {
    const lastAddedId = newlyAddedNoteIds[newlyAddedNoteIds.length - 1];
    console.log('监测到新增笔记状态变化，将尝试聚焦:', lastAddedId);
    // 使用专门的聚焦函数
    focusNewNoteInput(lastAddedId);
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
  console.log('启动添加子分类到:', node);

  // 如果已经有其他分类正在添加子分类，取消它们
  const currentAddingCategoryIds = Object.keys(isAddingChildTo).filter(id => isAddingChildTo[id]);
  if (currentAddingCategoryIds.length > 0) {
    // 取消所有现有的添加操作
    currentAddingCategoryIds.forEach(id => {
      isAddingChildTo[id] = false;
    });
  }

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
  nextTick(() => {
    console.log('触发nextTick强制聚焦分类输入框');
    focusNewCategoryInput(parentId);
  });
};

// 聚焦新分类输入框
const focusNewCategoryInput = (parentId: string) => {
  // 首先检查是否有引用存在
  if (inputRefs.value[parentId]) {
    console.log('通过ref聚焦输入框，父ID:', parentId);
    const input = inputRefs.value[parentId];
    if (input) {
      input.focus();
      // 将光标放在文本末尾，而不是全选
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
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
      // 将光标放在文本末尾，而不是全选
      const length = inputElement.value.length;
      inputElement.setSelectionRange(length, length);
    } else {
      // 如果没找到，再等一会儿尝试，给DOM更多时间更新
      setTimeout(() => {
        console.log('第二次尝试聚焦输入框');
        inputElement = document.getElementById(`new-category-input-${parentId}`) as HTMLInputElement;
        
        if (inputElement) {
          console.log('找到输入框，聚焦成功');
          inputElement.focus();
          // 将光标放在文本末尾，而不是全选
          const length = inputElement.value.length;
          inputElement.setSelectionRange(length, length);
        } else {
          // 最后一次尝试，使用querySelector
          console.log('尝试使用querySelector查找输入框');
          const containerSelector = `[data-children-of="${parentId}"]`;
          const container = document.querySelector(containerSelector);
          
          if (container) {
            const input = container.querySelector('input') as HTMLInputElement;
            if (input) {
              console.log('通过容器找到输入框，聚焦成功');
              input.focus();
              // 将光标放在文本末尾，而不是全选
              const length = input.value.length;
              input.setSelectionRange(length, length);
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
  
  // 设置短暂延时，避免与其他点击事件冲突
  setTimeout(() => {
    // 确保当前活动元素不是同一个输入框
    const activeElement = document.activeElement as HTMLElement;
    const inputElement = document.getElementById(`new-category-input-${parentId}`) as HTMLInputElement;
    
    if (activeElement !== inputElement && isAddingChildTo[parentId]) {
      console.log('输入框失焦，检查分类名称:', parentId, newCategoryName.value);
      
      // 如果有内容，则保存
      if (newCategoryName.value.trim()) {
        // 调用保存函数，确保点击输入框外自动保存
        saveNewCategory(parentId);
      } else {
        // 如果没有内容，则取消添加
        cancelAddCategory();
      }
    }
  }, 100); // 使用较短的延时，提高响应速度
};

// 启动添加新笔记
const startAddNote = (node: ContextMenuNode) => {
  console.log('启动添加笔记到分类:', node);

  // 如果已经有其他分类正在添加笔记，取消它
  const currentAddingNoteIds = Object.keys(isAddingNoteTo).filter(id => isAddingNoteTo[id]);
  if (currentAddingNoteIds.length > 0) {
    // 取消所有现有的添加操作
    currentAddingNoteIds.forEach(id => {
      isAddingNoteTo[id] = false;
    });
  }

  // 必须是分类节点才能添加笔记
  if (node.nodeType !== 'category') {
    console.warn('只能在分类节点下添加笔记');
    return;
  }

  // 确保分类ID有效
  if (!node.id) {
    console.error('分类ID无效，无法添加笔记');
    return;
  }

  // 生成默认笔记名称，使用自动递增功能
  newNoteName.value = generateDefaultNoteName(node.id);
  
  // 记录当前父分类ID
  currentEditingParentId.value = node.id;
  
  // 设置状态为正在添加笔记
  isAddingNoteTo[node.id] = true;
  
  // 强制展开分类节点
  console.log('强制展开分类节点:', node.id);
  emit('toggle-expand', { id: node.id, expanded: true });
  
  // 尝试强制让下一个tick聚焦
  nextTick(() => {
    console.log('触发nextTick强制聚焦');
    focusNewNoteInput(node.id);
  });
};

// 生成默认笔记名称 - 根据父分类ID生成递增名称
const generateDefaultNoteName = (parentId: string): string => {
  // 基本名称
  const baseName = '新建笔记';
  const siblingNames: string[] = [];
  let maxSuffix = 0;
  
  // 从当前节点的子节点中提取已有笔记名称
  if (parentId) {
    // 根据父节点ID获取其子节点区域
    const childrenContainer = document.querySelector(`[data-children-of="${parentId}"]`);
    if (childrenContainer) {
      // 获取子节点区域中的所有笔记名称（通过查找文本和图标类型区分）
      const childNotes = childrenContainer.querySelectorAll('.category-item .text-gray-700.text-sm');
      childNotes.forEach(child => {
        // 找到同级元素中的图标，判断是否为笔记
        const icon = child.parentElement?.querySelector('.pi-file');
        if (icon && child.textContent) {
          siblingNames.push(child.textContent.trim());
        }
      });

      if (siblingNames.length === 0) {
        // 如果没有子笔记，直接返回基本名称
        return baseName;
      }
    } else {
      // 如果找不到子节点容器，直接返回基本名称
      return baseName;
    }
  }
  
  // 如果没有找到笔记，或者基本名称不存在，直接返回基本名称
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

// 聚焦新笔记输入框
const focusNewNoteInput = async (parentId: string) => {
  // 标记为正在尝试聚焦
  const focusAttemptFlag = `focus_attempt_${Date.now()}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[focusAttemptFlag] = true;
  
  // 首先直接尝试通过ref聚焦
  await nextTick();
  const inputEl = noteInputRefs.value[parentId];
  if (inputEl) {
    inputEl.focus();
    console.log('成功聚焦到笔记输入框(通过ref):', parentId);
    
    // 设置光标位置到文本末尾，避免全选
    const textLength = inputEl.value.length;
    try {
      // 尝试将光标放在文本末尾
      setTimeout(() => {
        inputEl.setSelectionRange(textLength, textLength);
      }, 10);
    } catch (e) {
      console.warn('设置光标位置失败:', e);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any)[focusAttemptFlag];
    return;
  }
  
  // 使用递归尝试方式，持续尝试聚焦直到成功或超过最大尝试次数
  const tryFocus = (attemptCount = 1, maxAttempts = 5) => {
    // 如果已经不再需要聚焦，则停止尝试
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any)[focusAttemptFlag]) {
      return;
    }
    
    console.log(`尝试聚焦第${attemptCount}次，使用DOM选择器`);
    
    // 尝试通过ID选择器
    const inputById = document.getElementById(`new-note-input-${parentId}`) as HTMLInputElement;
    if (inputById) {
      inputById.focus();
      console.log(`第${attemptCount}次尝试成功，通过ID选择器`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[focusAttemptFlag];
      return;
    }
    
    // 尝试通过更精确的选择器
    const containerSelector = `[data-children-of="${parentId}"] .new-note-item input`;
    const inputByContainer = document.querySelector(containerSelector) as HTMLInputElement;
    if (inputByContainer) {
      inputByContainer.focus();
      console.log(`第${attemptCount}次尝试成功，通过容器选择器`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[focusAttemptFlag];
      return;
    }
    
    // 尝试通过通用选择器
    const anyInput = document.querySelector('.new-note-item input') as HTMLInputElement;
    if (anyInput) {
      anyInput.focus();
      console.log(`第${attemptCount}次尝试成功，通过通用选择器`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[focusAttemptFlag];
      return;
    }
    
    // 如果未超过最大尝试次数，则继续尝试
    if (attemptCount < maxAttempts) {
      setTimeout(() => tryFocus(attemptCount + 1, maxAttempts), 50 * attemptCount);
    } else {
      console.error(`聚焦失败，已尝试${maxAttempts}次`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[focusAttemptFlag];
    }
  };
  
  // 开始尝试聚焦
  tryFocus();
};

// 保存新笔记
const saveNewNote = (parentId: string) => {
  if (isSavingNote.value) {
    return; // 如果正在保存，则不执行
  }

  if (!newNoteName.value.trim()) {
    cancelAddNote();
    return;
  }

  // 进入保存状态
  isSavingNote.value = true;

  // 构建用于创建笔记的数据
  const noteData: ContextMenuNode = {
    id: '', // 这个ID会由服务器生成，初始化为空字符串
    label: newNoteName.value.trim(),
    nodeType: 'note',
    target: null, // 符合ContextMenuNode接口要求
    parentId: parentId, // 重要：这里传递父分类的ID，即实际创建笔记的分类ID
    isNewNote: true, // 标记为新笔记，供上层组件识别
    callback: (success: boolean) => {
      // 创建成功后的回调
      isSavingNote.value = false;
      if (success) {
        // 重置状态
        isAddingNoteTo[parentId] = false;
        newNoteName.value = '';
        console.log('笔记创建成功');
      } else {
        console.error('笔记创建失败');
        // 可以选择重试或保持编辑状态
      }
    }
  };

  console.log('发送创建笔记请求，父分类ID:', parentId);
  
  // 发送创建笔记的操作请求给父组件
  emitContextMenuAction('create-note', noteData);
};

// 取消添加笔记
const cancelAddNote = () => {
  const currentAddingNoteIds = Object.keys(isAddingNoteTo).filter(id => isAddingNoteTo[id]);
  currentAddingNoteIds.forEach(id => {
    isAddingNoteTo[id] = false;
  });
  newNoteName.value = '';
  currentEditingParentId.value = '';
};

// 处理新笔记输入框失焦事件
const handleNewNoteInputBlur = (parentId: string) => {
  // 如果正在保存中，不执行任何操作
  if (isSavingNote.value) {
    return;
  }
  
  // 设置短暂延时，避免与其他点击事件冲突
  setTimeout(() => {
    // 检查当前活动元素是否为其他相关元素(如菜单或按钮)
    const activeElement = document.activeElement as HTMLElement;
    const inputElement = document.getElementById(`new-note-input-${parentId}`) as HTMLInputElement;
    
    // 如果当前焦点不在笔记输入框上，并且该分类仍处于添加笔记状态
    if (activeElement !== inputElement && isAddingNoteTo[parentId]) {
      console.log('笔记输入框失焦，处理内容:', newNoteName.value);
      
      // 如果有内容，则保存
      if (newNoteName.value.trim()) {
        saveNewNote(parentId);
      } else {
        // 如果没有内容，则取消
        cancelAddNote();
      }
    }
  }, 100); // 使用较短的延时，提高响应速度
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

/* 新分类输入框样式 */
.new-category-item {
  animation: fadeIn 0.3s ease;
}

.new-category-item input {
  background-color: #f0f4ff;
  border-color: #818cf8;
  transition: all 0.2s ease;
}

.new-category-item input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  background-color: #ffffff;
}

.new-category-item .pi-folder {
  color: #6366f1;
  animation: pulse 1s ease;
}

/* 笔记输入框样式增强 */
.new-note-item {
  animation: fadeIn 0.3s ease;
}

.new-note-item input {
  background-color: #f0f9ff;
  border-color: #60a5fa;
  transition: all 0.2s ease;
}

.new-note-item input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  background-color: #ffffff;
}

.new-note-item .pi-file {
  color: #3b82f6;
  animation: pulse 1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style> 