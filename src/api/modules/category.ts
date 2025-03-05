import { request } from '../requests'

import type { Category, CreateCategoryRequest } from '../types'

// 获取所有分类
export const getCategories = async () => {
  return request<Category[]>('get', '/categories')
}

// 创建分类
export const createCategorie = async (data: CreateCategoryRequest) => {
  return request<Category[]>('post', '/categories', data)
}
