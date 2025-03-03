import { request } from '../requests'
import type {
  CreateNoteRequest,
  UpdateNoteRequest,
  GetNotesResponse,
  GetNoteDetailResponse,
} from '../types'

// 创建笔记
export const createNote = async (data: CreateNoteRequest) => {
  return request<GetNoteDetailResponse>('post', '/notes', data)
}

// 更新笔记
export const updateNote = async (id: number, data: UpdateNoteRequest) => {
  return request<GetNoteDetailResponse>('put', `/notes/${id}`, data)
}

// 删除笔记
export const deleteNote = async (id: number) => {
  return request<void>('delete', `/notes/${id}`)
}

// 获取笔记列表
export const getNotes = async () => {
  return request<GetNotesResponse[]>('get', '/notes')
}

// 获取笔记详情
export const getNoteDetail = async (id: number) => {
  return request<GetNoteDetailResponse>('get', `/notes/${id}`)
}
