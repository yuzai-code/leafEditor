// 请求工具封装
import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { ApiResponse } from './types'

const api: AxiosInstance = axios.create({
  timeout: 5000,
  baseURL: 'http://localhost:8080/api/v1',
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
  (response) => {
    // 处理不同格式的响应
    const data = response.data
    console.log('原始响应数据:', data)

    // 如果后端直接返回数据（没有包装在code/data中）
    if (data && typeof data.code === 'undefined' && typeof data.status === 'undefined') {
      return {
        ...response,
        data: {
          code: 0, // 成功状态码
          data: data, // 原始数据
          status: 'success',
        },
      }
    }

    // 如果后端返回了status字段但没有code字段
    if (data && typeof data.code === 'undefined' && data.status === 'success') {
      return {
        ...response,
        data: {
          code: 0,
          data: data.data || data,
          status: data.status,
        },
      }
    }

    return response
  },
  (error) => {
    console.error('API 请求失败:', error)

    // 如果有响应但状态码不是2xx
    if (error.response && error.response.data) {
      const errorData = error.response.data
      // 构造统一的错误格式
      const formattedError = {
        ...error,
        response: {
          ...error.response,
          data: {
            code: error.response.status,
            message: errorData.error || errorData.message || '请求失败',
            data: null,
          },
        },
      }
      return Promise.reject(formattedError)
    }

    return Promise.reject(error)
  },
)

// 通用请求函数
export const request = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown, // 请求体参数
): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await api({
      method,
      url,
      data, // POST/PUT 请求体
      params: method === 'get' ? data : undefined, // GET 请求参数
    })

    return response.data as ApiResponse<T>
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      return error.response.data as ApiResponse<T>
    }
    throw error
  }
}

export default api
