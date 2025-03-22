<template>
  <div class="category-manager">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between px-4 py-2">
      <h3 class="text-xs font-semibold text-gray-500">笔记分类</h3>
      <div class="flex items-center">
        <button 
          class="text-gray-400 hover:text-gray-600 focus:outline-none mx-1" 
          @click="addNewCategory"
        >
          <i class="pi pi-plus text-xs"></i>
        </button>
      </div>
    </div>

    <!-- 新分类表单 -->
    <div v-if="isAddingCategory" class="px-4 py-2">
      <div class="bg-gray-50 p-2 rounded border border-gray-200">
        <input 
          v-model="newCategoryName" 
          class="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
          placeholder="分类名称"
        />
        <select 
          v-model="selectedParentId" 
          class="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
        >
          <option :value="null">无父分类</option>
          <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
            {{ cat.label }}
          </option>
        </select>
        <div class="flex justify-between">
          <button 
            class="text-xs px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            @click="saveNewCategory"
          >
            保存
          </button>
          <button 
            class="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            @click="cancelAddCategory"
          >
            取消
          </button>
        </div>
      </div>
    </div>
    
    <!-- 分类树内容 -->
    <div v-if="isExpanded">
      <!-- 加载中提示 -->
      <div v-if="categoryTree.length === 0" class="px-4 py-2 text-sm text-gray-500">
        加载分类中...
      </div>
      
      <!-- 分类树组件 -->
      <CategoryTree 
        v-else 
        :nodes="categoryTree"
        @item-click="handleCategoryClick"
        @context-menu-action="handleContextMenuAction"
        @toggle-expand="handleNodeToggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import CategoryTree from './CategoryTree.vue';
import { getCategories, createCategory } from '../../api/modules/category';
import type { Category, CreateCategoryRequest } from '../../api/types';

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
    [key: string]: unknown;
  };
}

// 状态管理
const isExpanded = ref(true);
const isAddingCategory = ref(false);
const newCategoryName = ref('');
const selectedParentId = ref<string | null>(null);
const categoryTree = ref<TreeNode[]>([]);

// 扁平化分类列表，用于选择父分类
const flatCategories = computed(() => {
  const result: { id: string; label: string }[] = [];
  
  const flatten = (nodes: TreeNode[], prefix = '') => {
    nodes.forEach(node => {
      if (node.nodeType === 'category') {
        result.push({
          id: node.id,
          label: prefix + node.label
        });
        
        if (node.children && node.children.length > 0) {
          flatten(node.children, prefix + node.label + ' > ');
        }
      }
    });
  };
  
  flatten(categoryTree.value);
  return result;
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

// 添加新分类
const addNewCategory = () => {
  isAddingCategory.value = true;
};

// 保存新分类
const saveNewCategory = async () => {
  if (!newCategoryName.value.trim()) {
    return;
  }
  
  try {
    const categoryData: CreateCategoryRequest = {
      name: newCategoryName.value.trim(),
      parent_id: selectedParentId.value
    };
    
    console.log('发送创建分类请求:', categoryData);
    
    const response = await createCategory(categoryData);
    console.log('创建分类响应:', response);
    
    if (response.code === 0 || response.status === 'success') {
      // 重新加载分类
      await loadCategories();
      
      // 重置状态
      newCategoryName.value = '';
      isAddingCategory.value = false;
    } else {
      console.error('创建分类失败:', response);
    }
  } catch (error) {
    console.error('创建分类失败:', error);
  }
};

// 取消添加新分类
const cancelAddCategory = () => {
  newCategoryName.value = '';
  isAddingCategory.value = false;
};

// 处理分类点击事件
const handleCategoryClick = (node: CategoryClickInfo) => {
  console.log('分类点击:', node);
  // 这里可以添加分类点击后的逻辑
};

// 处理上下文菜单操作
const handleContextMenuAction = (data: ContextMenuAction) => {
  const { action, node } = data;
  console.log('上下文菜单操作:', action, node);
  
  // 根据不同的操作执行不同的逻辑
  switch (action) {
    case 'create-note':
      console.log('创建笔记在分类:', node.id);
      // TODO: 实现创建笔记的逻辑
      break;
    case 'create-category':
      console.log('在分类下创建子分类:', node.id);
      // TODO: 实现创建子分类的逻辑
      break;
    case 'delete-category':
      console.log('删除分类:', node.id);
      // TODO: 实现删除分类的逻辑
      break;
    case 'rename-category':
      console.log('重命名分类:', node.id);
      // TODO: 实现重命名分类的逻辑
      break;
    case 'move-category':
      console.log('移动分类:', node.id);
      // TODO: 实现移动分类的逻辑
      break;
    default:
      console.log('未知操作:', action);
  }
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
}
</style> 