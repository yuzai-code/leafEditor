import type { ApiResponse } from './types'
import type {
  CreateCategoryRequest,
  CreateNoteRequest,
  GetNoteDetailResponse,
  GetNotesResponse,
  UpdateNoteRequest,
  Category,
  Tag,
} from './types'
import { DataProviderFactory } from '@/services/db/DataProviderFactory'

// 创建统一的响应格式函数
function createResponse<T>(data: T, status = 'success', code = 0): ApiResponse<T> {
  return {
    code,
    data,
    status,
  }
}

// 错误处理函数 - 使用泛型以匹配正确的返回类型
function handleError<T>(error: unknown, fallbackData: T): ApiResponse<T> {
  console.error('API 请求失败:', error)

  let message = '请求处理失败'
  if (error instanceof Error) {
    message = error.message
  }

  return {
    code: 500,
    data: fallbackData,
    status: 'error',
    message,
  }
}

// 笔记相关 API 适配
export async function apiCreateNote(
  data: CreateNoteRequest,
): Promise<ApiResponse<GetNoteDetailResponse>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const result = await provider.createNote(data)
    return createResponse(result)
  } catch (error) {
    // 创建一个空的笔记详情作为错误时的备用数据
    const fallbackData: GetNoteDetailResponse = {
      id: 0,
      title: '',
      content: '',
      yaml_meta: '',
      file_path: '',
      category_id: 0,
      created_at: '',
      updated_at: '',
      version: 0,
      checksum: '',
      category: { id: '0', name: '', parent_id: null },
      tags: [],
    }
    return handleError(error, fallbackData)
  }
}

export async function apiUpdateNote(
  id: number,
  data: UpdateNoteRequest,
): Promise<ApiResponse<GetNoteDetailResponse>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const result = await provider.updateNote(id, data)
    return createResponse(result)
  } catch (error) {
    // 创建一个空的笔记详情作为错误时的备用数据
    const fallbackData: GetNoteDetailResponse = {
      id: id,
      title: '',
      content: '',
      yaml_meta: '',
      file_path: '',
      category_id: 0,
      created_at: '',
      updated_at: '',
      version: 0,
      checksum: '',
      category: { id: '0', name: '', parent_id: null },
      tags: [],
    }
    return handleError(error, fallbackData)
  }
}

export async function apiDeleteNote(id: number): Promise<ApiResponse<void>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    await provider.deleteNote(id)
    return createResponse<void>(undefined)
  } catch (error) {
    return handleError<void>(error, undefined)
  }
}

export async function apiGetNotes(): Promise<ApiResponse<GetNotesResponse[]>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const notes = await provider.getNotes()
    return createResponse(notes)
  } catch (error) {
    return handleError<GetNotesResponse[]>(error, [])
  }
}

export async function apiGetNoteDetail(id: number): Promise<ApiResponse<GetNoteDetailResponse>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const note = await provider.getNoteDetail(id)
    return createResponse(note)
  } catch (error) {
    // 创建一个空的笔记详情作为错误时的备用数据
    const fallbackData: GetNoteDetailResponse = {
      id: id,
      title: '',
      content: '',
      yaml_meta: '',
      file_path: '',
      category_id: 0,
      created_at: '',
      updated_at: '',
      version: 0,
      checksum: '',
      category: { id: '0', name: '', parent_id: null },
      tags: [],
    }
    return handleError(error, fallbackData)
  }
}

// 分类相关 API 适配
export async function apiGetCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const categories = await provider.getCategories()
    return createResponse(categories)
  } catch (error) {
    return handleError<Category[]>(error, [])
  }
}

export async function apiCreateCategory(
  data: CreateCategoryRequest,
): Promise<ApiResponse<Category>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const category = await provider.createCategory(data)
    return createResponse(category)
  } catch (error) {
    // 创建一个空的分类作为错误时的备用数据
    const fallbackData: Category = {
      id: '0',
      name: '',
      parent_id: null,
    }
    return handleError(error, fallbackData)
  }
}

// 标签相关 API 适配
export async function apiGetTags(): Promise<ApiResponse<Tag[]>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const provider = await factory.getDataProvider()
    const tags = await provider.getTags()
    return createResponse(tags)
  } catch (error) {
    return handleError<Tag[]>(error, [])
  }
}

// 网络状态 API
export async function apiCheckNetworkStatus(): Promise<ApiResponse<{ isOffline: boolean }>> {
  try {
    const factory = DataProviderFactory.getInstance()
    const isOffline = factory.isOffline()
    return createResponse({ isOffline })
  } catch (error) {
    return handleError<{ isOffline: boolean }>(error, { isOffline: true })
  }
}

// 切换在线/离线模式
export async function apiToggleNetworkMode(): Promise<ApiResponse<{ isOffline: boolean }>> {
  try {
    const factory = DataProviderFactory.getInstance()
    await factory.toggleMode()
    const isOffline = factory.isOffline()
    return createResponse({ isOffline })
  } catch (error) {
    return handleError<{ isOffline: boolean }>(error, { isOffline: true })
  }
}
