<template>
  <div class="category-manager">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between px-4 py-2">
      <h3 class="text-xs font-semibold text-gray-500">笔记分类</h3>
      <div class="flex items-center">
        <button 
          class="text-gray-400 hover:text-gray-600 focus:outline-none mx-1" 
          @click="addRootCategory"
        >
          <i class="pi pi-plus text-xs"></i>
        </button>
      </div>
    </div>
    
    <!-- 分类树内容 -->
    <div v-if="isExpanded" class="category-content">
      <!-- 加载中提示 -->
      <div v-if="categoryTree.length === 0" class="px-4 py-2 text-sm text-gray-500">
        加载分类中...
      </div>
      
      <!-- 根级新增分类输入框 -->
      <div v-if="isAddingRootCategory" class="px-4 py-2">
        <div class="flex items-center">
          <div class="w-4 mr-1"></div>
          <div class="flex-1 flex items-center">
            <i class="pi pi-folder mr-2 text-gray-500"></i>
            <input
              v-model="newRootCategoryName"
              class="text-gray-700 text-sm flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
              placeholder="分类名称"
              @keyup.enter="saveRootCategory"
              @keyup.esc="cancelRootCategory"
              @blur="handleRootInputBlur"
              ref="rootCategoryInputRef"
              :disabled="isSaving"
            />
            <div v-if="isSaving" class="ml-2">
              <i class="pi pi-spin pi-spinner text-gray-400 text-xs"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 分类树组件 -->
      <CategoryTree 
        :nodes="categoryTree"
        @item-click="handleCategoryClick"
        @context-menu-action="handleContextMenuAction"
        @toggle-expand="handleNodeToggle"
        @rename-category="handleRenameCategory"
      />
    </div>

    <!-- 删除确认对话框 -->
    <ConfirmDialog></ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import CategoryTree from './CategoryTree.vue';
import { getCategories, createCategory, renameCategory, deleteCategory } from '../../api/modules/category';
import type { Category, CreateCategoryRequest, RenameCategoryRequest } from '../../api/types';
import { useConfirm } from 'primevue/useconfirm';

// 获取确认服务
const confirm = useConfirm();

// 树节点类型定义
interface TreeNode {
  id: string;
  label: string;
  icon: string;
  expanded?: boolean;
  children?: TreeNode[];
  selected?: boolean;
  nodeType: 'category' | 'note' | 'system';
}

// 分类点击信息
interface CategoryClickInfo {
  id: string;
  label: string;
  nodeType: string;
}

// 上下文菜单操作
interface ContextMenuAction {
  action: string;
  node: {
    id: string;
    label: string;
    nodeType: string;
    hasChildren?: boolean;
    target?: Event;
    isNewCategory?: boolean;
    callback?: (success: boolean) => void;
    [key: string]: unknown;
  };
}

// 重命名数据
interface RenameData {
  id: string;
  newName: string;
  oldName: string;
  callback: (success: boolean) => void;
}

// 状态管理
const isExpanded = ref(true);
const categoryTree = ref<TreeNode[]>([]);

// 根级新增分类状态
const isAddingRootCategory = ref(false);
const newRootCategoryName = ref('');
const rootCategoryInputRef = ref<HTMLInputElement | null>(null);
const isSaving = ref(false);

// 监听isAddingRootCategory状态变化，聚焦输入框
watch(isAddingRootCategory, async (newValue) => {
  if (newValue) {
    // 等待DOM更新后聚焦输入框
    await nextTick();
    rootCategoryInputRef.value?.focus();
    
    // 全选文本以便于用户直接替换
    rootCategoryInputRef.value?.select();
  }
});

// 加载分类数据
const loadCategories = async () => {
  try {
    const response = await getCategories();
    console.log('获取分类数据:', response);
    if (response.code === 0 && response.data) {
      // 构建分类树
      categoryTree.value = buildCategoryTree(response.data);
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

// 构建分类树结构
const buildCategoryTree = (categories: Category[]): TreeNode[] => {
  // 将分类数据转换为树节点
  const convertToTreeNode = (category: Category): TreeNode => {
    return {
      id: category.id,
      label: category.name,
      icon: 'pi-folder',
      expanded: false,
      children: category.children?.map(convertToTreeNode),
      nodeType: 'category'
    };
  };
  
  return categories.map(convertToTreeNode);
};

// 添加根级分类
const addRootCategory = async () => {
  // 不隐藏现有视图，而是在树的顶部添加一个输入框
  // 生成默认分类名称
  const defaultCategoryName = generateDefaultCategoryName();
  
  // 直接设置默认名称
  newRootCategoryName.value = defaultCategoryName;
  
  // 显示添加表单
  isAddingRootCategory.value = true;
};

// 生成默认分类名称
const generateDefaultCategoryName = (): string => {
  const baseName = '新增分类';
  
  // 获取当前所有分类名称
  const allCategoryNames = getAllCategoryNames(categoryTree.value);
  
  // 检查基础名称是否已存在
  if (!allCategoryNames.includes(baseName)) {
    return baseName;
  }
  
  // 查找最大的数字后缀
  let maxSuffix = 0;
  allCategoryNames.forEach(name => {
    if (name.startsWith(baseName)) {
      // 提取数字后缀
      const suffixMatch = name.substring(baseName.length).match(/^(\d+)$/);
      if (suffixMatch) {
        const suffix = parseInt(suffixMatch[1], 10);
        if (suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }
  });
  
  // 返回递增的名称
  return `${baseName}${maxSuffix + 1}`;
};

// 获取所有分类名称（递归）
const getAllCategoryNames = (nodes: TreeNode[]): string[] => {
  let names: string[] = [];
  
  nodes.forEach(node => {
    names.push(node.label);
    
    if (node.children && node.children.length > 0) {
      names = names.concat(getAllCategoryNames(node.children));
    }
  });
  
  return names;
};

// 保存根级分类
const saveRootCategory = async () => {
  // 如果正在保存中，直接返回
  if (isSaving.value) {
    return;
  }
  
  // 验证输入
  if (!newRootCategoryName.value.trim()) {
    cancelRootCategory();
    return;
  }
  
  try {
    // 设置保存中状态
    isSaving.value = true;
    
    // 保存展开状态
    const expandedState = saveExpandedState(categoryTree.value);
    
    const categoryData: CreateCategoryRequest = {
      name: newRootCategoryName.value.trim(),
      parent_id: null
    };
    
    console.log('发送创建分类请求:', categoryData);
    
    const response = await createCategory(categoryData);
    console.log('创建分类响应:', response);
    
    if (response.code === 0 || response.status === 'success') {
      // 重新加载分类
      await loadCategories();
      
      // 恢复展开状态
      restoreExpandedState(categoryTree.value, expandedState);
      
      // 重置状态
      newRootCategoryName.value = '';
      isAddingRootCategory.value = false;
    } else {
      console.error('创建分类失败:', response);
      // 可以在这里添加错误提示
    }
  } catch (error) {
    console.error('创建分类失败:', error);
    // 可以在这里添加错误提示
  } finally {
    // 结束保存状态
    isSaving.value = false;
  }
};

// 取消添加根级分类
const cancelRootCategory = () => {
  // 只有在非保存状态下才允许取消
  if (!isSaving.value) {
    newRootCategoryName.value = '';
    isAddingRootCategory.value = false;
  }
};

// 处理根分类输入框失焦事件
const handleRootInputBlur = () => {
  // 如果输入框内容非空，则保存
  if (newRootCategoryName.value.trim()) {
    saveRootCategory();
  } else {
    // 如果输入框内容为空，则取消添加
    cancelRootCategory();
  }
};

// 处理分类点击事件
const handleCategoryClick = (node: CategoryClickInfo) => {
  console.log('分类点击:', node);
  // 这里可以添加分类点击后的逻辑
};

// 处理重命名分类
const handleRenameCategory = async (data: RenameData) => {
  try {
    console.log('重命名分类:', data);
    
    // 保存展开状态
    const expandedState = saveExpandedState(categoryTree.value);
    
    // 调用重命名API，使用更新后的API格式
    const renameData: RenameCategoryRequest = {
      category_id: data.id,
      name: data.newName // 使用name替代new_name
    };
    
    const response = await renameCategory(renameData);
    
    if (response.code === 0 || response.status === 'success') {
      console.log('重命名成功:', response);
      // 重新加载分类或直接更新本地数据
      await loadCategories();
      
      // 恢复展开状态
      restoreExpandedState(categoryTree.value, expandedState);
      
      // 调用回调函数，通知成功
      data.callback(true);
    } else {
      console.error('重命名失败:', response);
      // 调用回调函数，通知失败
      data.callback(false);
    }
  } catch (error) {
    console.error('重命名分类失败:', error);
    // 调用回调函数，通知失败
    data.callback(false);
  }
};

// 处理上下文菜单操作
const handleContextMenuAction = async (data: ContextMenuAction | { action: ContextMenuAction }) => {
  // 处理潜在的嵌套格式
  let action: string;
  let node: ContextMenuAction['node'];
  
  if ('action' in data && typeof data.action === 'object') {
    // 处理嵌套的情况: { action: { action: string, node: {...} } }
    action = data.action.action;
    node = data.action.node;
  } else {
    // 正常的情况: { action: string, node: {...} }
    action = (data as ContextMenuAction).action;
    node = (data as ContextMenuAction).node;
  }
  
  console.log('上下文菜单操作:', action, node);
  
  // 根据不同的操作执行不同的逻辑
  switch (action) {
    case 'create-note':
      console.log('创建笔记在分类:', node.id);
      // TODO: 实现创建笔记的逻辑
      break;
      
    case 'create-category':
      console.log('在分类下创建子分类:', node.id);
      await handleCreateCategory(node);
      break;
      
    case 'delete-category':
      console.log('删除分类:', node.id);
      await handleDeleteCategory(node);
      break;
      
    case 'rename-category':
      console.log('重命名分类:', node.id);
      // 这里不需要处理，因为直接在 CategoryItem 中处理了重命名
      break;
      
    case 'move-category':
      console.log('移动分类:', node.id);
      // TODO: 实现移动分类的逻辑
      break;
      
    default:
      console.log('未知操作:', { action, node });
  }
};

// 处理创建分类操作
const handleCreateCategory = async (node: ContextMenuAction['node']) => {
  try {
    // 如果是内联创建的分类
    if (node.isNewCategory) {
      // 保存展开状态，避免刷新后折叠所有分类
      const expandedState = saveExpandedState(categoryTree.value);
      
      // 获取正确的父ID - 使用parentId而不是当前node.id
      const parentId = node.parentId as string;
      
      // 确保我们不会创建一个以自己为父级的分类
      if (parentId === node.id) {
        console.error('无法创建以自己为父级的分类');
        if (node.callback) {
          node.callback(false);
        }
        return;
      }
      
      const categoryData: CreateCategoryRequest = {
        name: node.label,
        parent_id: parentId
      };
      
      console.log('发送创建子分类请求:', categoryData);
      
      const response = await createCategory(categoryData);
      console.log('创建子分类响应:', response);
      
      if (response.code === 0 || response.status === 'success') {
        // 重新加载分类
        await loadCategories();
        
        // 恢复展开状态
        restoreExpandedState(categoryTree.value, expandedState);
        
        // 调用回调函数通知成功
        if (node.callback) {
          node.callback(true);
        }
      } else {
        console.error('创建子分类失败:', response);
        // 调用回调函数通知失败
        if (node.callback) {
          node.callback(false);
        }
      }
    }
  } catch (error) {
    console.error('创建分类失败:', error);
    // 调用回调函数通知失败
    if (node.callback) {
      node.callback(false);
    }
  }
};

// 处理删除分类
const handleDeleteCategory = async (node: ContextMenuAction['node']) => {
  confirm.require({
    message: `确定要删除分类 "${node.label}" 吗？如果存在子分类或笔记，将无法删除。`,
    header: '删除确认',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: '确定删除',
    rejectLabel: '取消',
    accept: async () => {
      try {
        // 保存展开状态，避免刷新后折叠所有分类
        const expandedState = saveExpandedState(categoryTree.value);
        
        console.log('发送删除分类请求:', node.id);
        
        const response = await deleteCategory(node.id);
        console.log('删除分类响应:', response);
        
        if (response.code === 0 || response.status === 'success') {
          // 重新加载分类
          await loadCategories();
          
          // 恢复展开状态
          restoreExpandedState(categoryTree.value, expandedState);
          
          // 如果有回调函数，调用它
          if (node.callback) {
            node.callback(true);
          }
        } else {
          console.error('删除分类失败:', response);
          // 如果有回调函数，调用它
          if (node.callback) {
            node.callback(false);
          }
        }
      } catch (error) {
        console.error('删除分类失败:', error);
        // 如果有回调函数，调用它
        if (node.callback) {
          node.callback(false);
        }
      }
    },
    reject: () => {
      console.log('取消删除分类');
    }
  });
};

// 保存当前展开状态
const saveExpandedState = (nodes: TreeNode[]): Record<string, boolean> => {
  const expandedState: Record<string, boolean> = {};
  
  const traverse = (treeNodes: TreeNode[]) => {
    treeNodes.forEach(node => {
      if (node.expanded) {
        expandedState[node.id] = true;
      }
      
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  
  traverse(nodes);
  return expandedState;
};

// 恢复展开状态
const restoreExpandedState = (nodes: TreeNode[], expandedState: Record<string, boolean>) => {
  const traverse = (treeNodes: TreeNode[]) => {
    treeNodes.forEach(node => {
      if (expandedState[node.id]) {
        node.expanded = true;
      }
      
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  
  traverse(nodes);
};

// 处理节点展开/折叠
const handleNodeToggle = (data: { id: string; expanded: boolean }) => {
  // 查找并更新节点的展开状态
  const updateNodeExpanded = (nodes: TreeNode[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      if (node.id === data.id) {
        // 找到目标节点，更新其展开状态
        node.expanded = data.expanded;
        return true;
      }
      
      // 递归检查子节点
      if (node.children && node.children.length > 0) {
        if (updateNodeExpanded(node.children)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  updateNodeExpanded(categoryTree.value);
};

// 组件挂载时加载数据
onMounted(() => {
  loadCategories();
});

// 公开方法供父组件调用
defineExpose({
  loadCategories,
  toggleExpand: () => {
    isExpanded.value = !isExpanded.value;
  }
});
</script>

<style scoped>
.category-manager {
  display: flex;
  flex-direction: column;
  /* 确保组件自身不会造成溢出 */
  max-height: 100%;
  overflow: hidden;
}

.category-content {
  /* 允许内容溢出时显示滚动条 */
  overflow-y: auto;
  overflow-x: hidden;
  /* 最大高度设置，这个值可以根据实际情况调整 */
  max-height: calc(100vh - 300px);
}

/* 自定义滚动条样式 */
.category-content::-webkit-scrollbar {
  width: 4px;
}

.category-content::-webkit-scrollbar-track {
  background: transparent;
}

.category-content::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 8px;
}

.category-content::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style> 