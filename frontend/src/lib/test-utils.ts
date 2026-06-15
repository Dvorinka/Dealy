// Test configuration and utilities
import { HttpClient } from './api'
import type { Evidence, EvidenceType, Customer, Order } from '../types'

// Test utilities
type MockResponse<T> = {
  data: T
  status: number
  ok: true
}

type MockError = {
  status: number
  code: string
  message: string
  details?: any
}

// Mock API service for testing
class MockApiService {
  private client: HttpClient
  
  constructor() {
    this.client = new HttpClient()
  }
  
  // Mock evidence endpoints
  async mockEvidenceList(): Promise<MockResponse<Evidence[]>> {
    // Simulate API call
    return Promise.resolve({
      data: mockEvidenceData,
      status: 200,
      ok: true
    })
  }
  
  async mockEvidenceCreate(data: Partial<Evidence>): Promise<MockResponse<{ id: number }>> {
    return Promise.resolve({
      data: { id: Math.floor(Math.random() * 1000) },
      status: 201,
      ok: true
    })
  }
  
  async mockEvidenceUpdate(id: number, data: Partial<Evidence>): Promise<MockResponse<{ updated: boolean }>> {
    return Promise.resolve({
      data: { updated: true },
      status: 200,
      ok: true
    })
  }
  
  async mockEvidenceDelete(id: number): Promise<MockResponse<{ deleted: boolean }>> {
    return Promise.resolve({
      data: { deleted: true },
      status: 200,
      ok: true
    })
  }
  
  // Mock customer endpoints
  async mockCustomerList(): Promise<MockResponse<Customer[]>> {
    return Promise.resolve({
      data: mockCustomerData,
      status: 200,
      ok: true
    })
  }
  
  async mockCustomerCreate(data: Partial<Customer>): Promise<MockResponse<{ id: number }>> {
    return Promise.resolve({
      data: { id: Math.floor(Math.random() * 1000) },
      status: 201,
      ok: true
    })
  }
  
  // Mock order endpoints
  async mockOrderList(): Promise<MockResponse<Order[]>> {
    return Promise.resolve({
      data: mockOrderData,
      status: 200,
      ok: true
    })
  }
  
  async mockOrderCreate(data: Partial<Order>): Promise<MockResponse<{ id: number; total_value: number }>> {
    return Promise.resolve({
      data: { 
        id: Math.floor(Math.random() * 1000),
        total_value: 150.00
      },
      status: 201,
      ok: true
    })
  }
  
  // Error simulation
  async mockError(status: number, code: string, message: string): Promise<never> {
    return Promise.reject({
      status,
      code,
      message,
      details: { error_id: `err_${Date.now()}` }
    })
  }
}

// Mock data
const mockEvidenceData: Evidence[] = [
  {
    id: 1,
    code: 'EVIDENCE-001',
    title: 'White powder sample',
    description: 'Small bag of white crystalline substance',
    type_id: 1,
    type_name: 'Narcotics',
    location_id: 1,
    location_name: 'Lab A',
    collected_by: 1,
    collector_name: 'Agent Smith',
    weight_grams: 500,
    purity_percent: 95,
    street_value: 25000,
    image_url: '/assets/evidence/ev1.jpg',
    status: 'stored',
    tags: ['narcotics', 'white', 'powder'],
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    code: 'EVIDENCE-002',
    title: 'Cash bundles',
    description: 'Multiple bundles of US currency',
    type_id: 3,
    type_name: 'Currency',
    location_id: 2,
    location_name: 'Safe house',
    collected_by: 2,
    collector_name: 'Agent Jones',
    weight_grams: 2000,
    purity_percent: 0,
    street_value: 50000,
    image_url: '/assets/evidence/ev2.jpg',
    status: 'in_transit',
    tags: ['cash', 'currency', 'money'],
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T14:20:00Z'
  }
]

const mockCustomerData: Customer[] = [
  {
    id: 1,
    codename: 'phantom',
    real_name: 'Unknown',
    contact: 'unknown@darknet.com',
    territory: 'South Southwest',
    trust_level: 8,
    status: 'active',
    total_spent: 125000,
    created_at: '2023-11-20T09:15:00Z',
    order_count: 5
  },
  {
    id: 2,
    codename: 'ghost',
    real_name: 'Jane Doe',
    contact: 'jane@example.com',
    territory: 'North Northwest',
    trust_level: 6,
    status: 'flagged',
    total_spent: 75000,
    created_at: '2023-12-10T16:45:00Z',
    order_count: 3
  }
]

const mockOrderData: Order[] = [
  {
    id: 1,
    order_code: 'ORD-2024-001',
    customer_id: 1,
    customer_codename: 'phantom',
    status: 'pending',
    total_value: 15000,
    meetup_location_id: 1,
    meetup_name: 'Abandoned warehouse',
    notes: 'Deliver in evening',
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z'
  },
  {
    id: 2,
    order_code: 'ORD-2024-002',
    customer_id: 2,
    customer_codename: 'ghost',
    status: 'confirmed',
    total_value: 35000,
    meetup_location_id: 2,
    meetup_name: 'Parking lot',
    notes: 'Cash payment requested',
    created_at: '2024-01-14T18:30:00Z',
    updated_at: '2024-01-14T18:30:00Z'
  }
]

// Test helper functions
export const testUtils = {
  createMockHttpClient: (mockService: MockApiService) => {
    const client = new HttpClient()
    
    // Override fetch method for testing
    const originalFetch = global.fetch
    
    global.fetch = jest.fn((url: string, options?: RequestInit) => {
      // Mock implementation based on URL and method
      const path = url.includes('/api') ? url.split('/api/')[1] : ''
      
      if (path.startsWith('evidence')) {
        if (options?.method === 'GET' && !path.includes('/')) {
          return mockService.mockEvidenceList()
        } else if (options?.method === 'POST') {
          return mockService.mockEvidenceCreate(JSON.parse(options.body as string))
        } else if (options?.method === 'PUT') {
          const id = parseInt(path.split('/').pop() || '0')
          return mockService.mockEvidenceUpdate(id, JSON.parse(options.body as string))
        } else if (options?.method === 'DELETE') {
          const id = parseInt(path.split('/').pop() || '0')
          return mockService.mockEvidenceDelete(id)
        }
      }
      
      return Promise.reject({ status: 404, code: 'NOT_FOUND', message: 'Not found' })
    })
    
    return client
  },
  
  cleanup: () => {
    // Restore original fetch
    global.fetch = global.fetch
  }
}

// Test data factories
export const testFactories = {
  createMockEvidence: (overrides: Partial<Evidence>): Evidence => ({
    id: 1,
    code: 'EVIDENCE-TEST-001',
    title: 'Test evidence',
    description: 'Test description',
    type_id: 1,
    type_name: 'Test Type',
    location_id: 1,
    location_name: 'Test Location',
    collected_by: 1,
    collector_name: 'Test Collector',
    weight_grams: 100,
    purity_percent: 50,
    street_value: 1000,
    image_url: '/assets/test.jpg',
    status: 'stored',
    tags: ['test', 'mock'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  createMockCustomer: (overrides: Partial<Customer>): Customer => ({
    id: 1,
    codename: 'test_customer',
    real_name: 'Test Customer',
    contact: 'test@example.com',
    territory: 'Test Territory',
    trust_level: 5,
    status: 'active',
    total_spent: 0,
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  createMockOrder: (overrides: Partial<Order>): Order => ({
    id: 1,
    order_code: 'ORD-TEST-001',
    customer_id: 1,
    customer_codename: 'test_customer',
    status: 'pending',
    total_value: 0,
    meetup_location_id: 1,
    meetup_name: 'Test Location',
    notes: 'Test order',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })
}

// Test assertions
export const testAssertions = {
  assertApiResponse: <T>(response: any, expectedStatus?: number): void => {
    if (!response.ok || (expectedStatus && response.status !== expectedStatus)) {
      throw new Error(`Expected status ${expectedStatus || 200}, got ${response.status}`)
    }
  },
  
  assertApiError: (error: any, expectedStatus?: number, expectedCode?: string): void => {
    if (!error.status || (expectedStatus && error.status !== expectedStatus)) {
      throw new Error(`Expected status ${expectedStatus}, got ${error.status}`)
    }
    if (expectedCode && error.code !== expectedCode) {
      throw new Error(`Expected code ${expectedCode}, got ${error.code}`)
    }
  },
  
  assertEvidenceMatches: (actual: Evidence, expected: Partial<Evidence>): void => {
    Object.entries(expected).forEach(([key, value]) => {
      if ((actual as any)[key] !== value) {
        throw new Error(`Expected ${key}=${value}, got ${(actual as any)[key]}`)
      }
    })
  }
}

export default testUtils
