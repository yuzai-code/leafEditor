// 请求工具封装
import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { ApiResponse } from './types'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器（可选）
api.interceptors.request.use(
  (config) => {
    // 可在此添加 token 等
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器（可选）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 请求失败:', error)
    return Promise.reject(error)
  },
)

// 通用请求函数
export const request = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown, // 请求体参数
): Promise<ApiResponse<T>> => {
  const response: AxiosResponse<ApiResponse<T>> = await api({
    method,
    url,
    data, // POST/PUT 请求体
    params: method === 'get' ? data : undefined, // GET 请求参数
  })
  return response.data
}

export default api
