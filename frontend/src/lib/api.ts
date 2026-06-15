import { z, ZodSchema } from 'zod'
import { useForm, UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useCallback } from 'react'

// API Error types
interface APIError {
  status: number
  code: string
  message: string
  details?: any
}

// HTTP client with interceptors and error handling
class HttpClient {
  private baseURL: string
  private token?: string

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  async request<T>(
    method: string,
    path: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${path}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error: APIError = await response.json().catch(() => ({
          status: response.status,
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`
        }))
        throw error
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error
      }
      
      // Network or other errors
      throw {
        status: 500,
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error'
      } as APIError
    }
  }

  // Individual methods
  async get<T>(path: string, options?: RequestInit) {
    return this.request<T>('GET', path, undefined, options)
  }

  async post<T>(path: string, data?: any, options?: RequestInit) {
    return this.request<T>('POST', path, data, options)
  }

  async put<T>(path: string, data?: any, options?: RequestInit) {
    return this.request<T>('PUT', path, data, options)
  }

  async delete<T>(path: string, options?: RequestInit) {
    return this.request<T>('DELETE', path, undefined, options)
  }
}

// Form validation schemas
export const evidenceValidationSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type_id: z.number().int().positive('Type is required'),
  location_id: z.number().int().positive().optional(),
  collected_by: z.number().int().positive().optional(),
  weight_grams: z.number().positive('Weight is required').optional(),
  purity_percent: z.number().min(0).max(100).optional(),
  street_value: z.number().min(0).optional(),
  image_url: z.string().url().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const customerValidationSchema = z.object({
  codename: z.string().min(1, 'Codename is required'),
  real_name: z.string().optional(),
  contact: z.string().optional(),
  territory: z.string().optional(),
  trust_level: z.number().min(1).max(10).optional(),
  status: z.string().optional(),
})

export const orderValidationSchema = z.object({
  order_code: z.string().optional(),
  customer_id: z.number().int().positive('Customer is required'),
  new_customer: customerValidationSchema.optional(),
  meetup_location_id: z.number().int().positive().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    evidence_id: z.number().int().positive('Evidence is required'),
    quantity: z.number().positive('Quantity is required'),
    unit_price: z.number().min(0, 'Unit price must be positive').positive('Unit price is required'),
  })).min(1, 'At least one item is required'),
})

// Form hooks
export const useValidatedForm = <T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues?: Partial<T>
) => {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as T,
    mode: 'onChange',
  })

  return form
}

// API client instance
const httpClient = new HttpClient()

// Export hooks for use in components
export { HttpClient, httpClient }
