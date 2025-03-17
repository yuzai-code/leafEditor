import { request } from '../requests'
import type { Category, CreateCategoryRequest } from '../types'

// 获取所有分类
export const getCategories = async () => {
  const response = await request<Category[]>('get', '/categories')
  console.log('获取分类响应:', response)

  // 检查分类数据结构
  if (response.data && Array.isArray(response.data)) {
    console.log('分类数量:', response.data.length)
    response.data.forEach((category, index) => {
      console.log(`分类 ${index + 1}:`, category.name)
      console.log(`  ID: ${category.id}`)
      console.log(`  父ID: ${category.parent_id}`)
      console.log(`  子分类数量: ${category.children?.length || 0}`)
      if (category.children && category.children.length > 0) {
        category.children.forEach((child, childIndex) => {
          console.log(`    子分类 ${childIndex + 1}: ${child.name}`)
        })
      }
    })
  }

  return response
}

// 创建分类
export const createCategory = async (data: CreateCategoryRequest) => {
  const response = await request<Category>('post', '/categories', data)
  console.log('创建分类响应:', response)
  return response
}
