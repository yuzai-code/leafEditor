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
      <div class="mb-3">
        <div class="flex items-center justify-between px-4 py-2">
          <h3 class="text-xs font-semibold text-gray-500">系统导航</h3>
          <button class="text-gray-400 hover:text-gray-600 focus:outline-none" @click="toggleFavorites">
            <i :class="['pi', favoritesExpanded ? 'pi-chevron-down' : 'pi-chevron-right', 'text-xs']"></i>
          </button>
        </div>

        <!-- 系统导航菜单 -->
        <div v-if="favoritesExpanded">
          <PanelMenu :model="systemMenuItems" class="w-full sidebar-panel-menu" />
        </div>
      </div>

      <!-- 分类部分 -->
      <div class="mb-3">
        <div class="flex items-center justify-between px-4 py-2">
          <h3 class="text-xs font-semibold text-gray-500">笔记分类</h3>
          <div class="flex items-center">
            <button class="text-gray-400 hover:text-gray-600 focus:outline-none mx-1" @click="addNewCategory">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>
        </div>

        <!-- 分类树 -->
        <div v-if="navigationExpanded">
          <!-- 添加新分类表单 -->
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
          
          <!-- 加载中提示 -->
          <div v-else-if="categoryMenuItems.length === 0" class="px-4 py-2 text-sm text-gray-500">
            加载分类中...
          </div>
          
          <!-- 分类菜单 -->
          <PanelMenu v-else :model="categoryMenuItems" class="w-full sidebar-panel-menu" />
        </div>
      </div>
    </div>
    
    <!-- 用户信息 -->
    <div class="user-info flex items-center p-3 border-t border-gray-100">
      <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
        <span class="text-indigo-600 font-medium">JS</span>
      </div>
      <div class="flex-1">
        <div class="text-sm font-medium text-gray-700">John Smith</div>
        <div class="text-xs text-gray-500">Designer</div>
      </div>
      <button class="text-gray-400 hover:text-gray-600 focus:outline-none">
        <i class="pi pi-cog text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import "primeicons/primeicons.css";
// 不需要局部导入PanelMenu，因为已在main.ts中全局注册
import { getCategories, createCategory } from '../api/modules/category';
import type { Category, CreateCategoryRequest } from '../api/types';

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

// 系统导航节点
const systemNodes = reactive<TreeNode[]>([
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: 'pi-home',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'all_notes',
    label: '全部笔记',
    icon: 'pi-file',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'recent',
    label: '最近使用',
    icon: 'pi-clock',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'favorites',
    label: '收藏',
    icon: 'pi-star',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'trash',
    label: '回收站',
    icon: 'pi-trash',
    expanded: false,
    nodeType: 'system'
  }
]);

// 系统菜单项
const systemMenuItems = computed((): PanelMenuItem[] => {
  return systemNodes.map(node => ({
    label: node.label,
    icon: `pi ${node.icon}`,
    command: () => handleNodeClick(node)
  }));
});

// API分类树
const categoryTree = ref<TreeNode[]>([]);

// 定义PanelMenu项的类型
interface PanelMenuItem {
  label: string;
  icon: string;
  command?: () => void;
  items?: PanelMenuItem[];
}

// 分类菜单项
const categoryMenuItems = computed(() => {
  return convertTreeNodesToMenuItems(categoryTree.value);
});

// 将TreeNode转换为PanelMenu所需的格式
const convertTreeNodesToMenuItems = (nodes: TreeNode[]): PanelMenuItem[] => {
  return nodes.map(node => {
    const menuItem: PanelMenuItem = {
      label: node.label,
      icon: `pi ${node.icon}`,
      command: () => handleNodeClick(node)
    };
    
    if (node.children && node.children.length > 0) {
      menuItem.items = convertTreeNodesToMenuItems(node.children);
    }
    
    return menuItem;
  });
};

// 处理节点点击事件
const handleNodeClick = (node: TreeNode) => {
  console.log('节点点击:', node);
  // 这里可以添加节点点击后的逻辑，比如选中节点、导航到相应页面等
};

// 收藏夹部分是否展开
const favoritesExpanded = ref(true);

// 导航部分是否展开
const navigationExpanded = ref(true);

// 新分类相关状态
const isAddingCategory = ref(false);
const newCategoryName = ref('');
const selectedParentId = ref<string | null>(null);

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

// 切换收藏夹部分的展开/折叠状态
const toggleFavorites = () => {
  favoritesExpanded.value = !favoritesExpanded.value;
};

// 切换导航部分的展开/折叠状态
const toggleNavigation = () => {
  navigationExpanded.value = !navigationExpanded.value;
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

// 组件挂载时加载数据
onMounted(() => {
  loadCategories();
});
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

/* 自定义PanelMenu样式 */
:deep(.sidebar-panel-menu) {
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link) {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link:hover) {
  background-color: #f9fafb;
}

:deep(.sidebar-panel-menu .p-panelmenu-content) {
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-menuitem-link) {
  padding: 0.5rem 1rem 0.5rem 2rem;
}

:deep(.sidebar-panel-menu .p-menuitem-link:hover) {
  background-color: #f9fafb;
}

:deep(.sidebar-panel-menu .p-menuitem-icon) {
  margin-right: 0.5rem;
}
</style>
