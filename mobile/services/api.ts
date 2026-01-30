/**
 * CroweLM API Service
 * Handles communication with the Python backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000;

// Cache configuration
const CACHE_PREFIX = 'crowelm_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  cached?: boolean;
}

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiService {
  private authToken: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      this.authToken = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async clearAuthToken(): Promise<void> {
    this.authToken = null;
    await AsyncStorage.removeItem('auth_token');
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  private async setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTTL?: number
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;

    // Check cache for GET requests
    if (useCache && options.method !== 'POST') {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) {
        return { data: cached, status: 200, cached: true };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = {
          message: response.statusText,
          status: response.status,
        };

        try {
          const errorData = await response.json();
          error.message = errorData.detail || errorData.message || response.statusText;
          error.code = errorData.code;
        } catch {}

        throw error;
      }

      const data = await response.json();

      // Cache successful GET responses
      if (useCache && options.method !== 'POST') {
        await this.setCache(cacheKey, data, cacheTTL);
      }

      return { data, status: response.status };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw { message: 'Request timeout', status: 408 };
      }

      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const { data } = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await this.setAuthToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      await this.clearAuthToken();
    }
  }

  async refreshToken(): Promise<string> {
    const { data } = await this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });

    await this.setAuthToken(data.token);
    return data.token;
  }

  // Chat / Research
  async chat(message: string, model: string = 'gpt-4'): Promise<{ response: string }> {
    const { data } = await this.request<{ response: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, model }),
    });
    return data;
  }

  // Target Analysis
  async analyzeTarget(
    uniprotId: string
  ): Promise<{
    target: any;
    structures: any[];
    ligands: any[];
    analysis: string;
  }> {
    const { data } = await this.request(
      `/targets/${uniprotId}/analyze`,
      { method: 'GET' },
      true,
      10 * 60 * 1000 // Cache for 10 minutes
    );
    return data;
  }

  async getTargetInfo(uniprotId: string): Promise<any> {
    const { data } = await this.request(
      `/targets/${uniprotId}`,
      { method: 'GET' },
      true
    );
    return data;
  }

  // Molecule Generation
  async generateMolecules(
    smiles: string,
    count: number = 10
  ): Promise<{ molecules: any[] }> {
    const { data } = await this.request<{ molecules: any[] }>('/molecules/generate', {
      method: 'POST',
      body: JSON.stringify({ smiles, count }),
    });
    return data;
  }

  async getMoleculeProperties(smiles: string): Promise<any> {
    const { data } = await this.request('/molecules/properties', {
      method: 'POST',
      body: JSON.stringify({ smiles }),
    });
    return data;
  }

  // Structure Prediction
  async predictStructure(sequence: string): Promise<{ pdb: string; confidence: number }> {
    const { data } = await this.request<{ pdb: string; confidence: number }>(
      '/structures/predict',
      {
        method: 'POST',
        body: JSON.stringify({ sequence }),
      }
    );
    return data;
  }

  // Pipeline
  async runPipeline(
    targetId: string,
    options: {
      stages?: string[];
      params?: Record<string, any>;
    } = {}
  ): Promise<{ pipelineId: string; status: string }> {
    const { data } = await this.request<{ pipelineId: string; status: string }>(
      '/pipelines/run',
      {
        method: 'POST',
        body: JSON.stringify({ targetId, ...options }),
      }
    );
    return data;
  }

  async getPipelineStatus(pipelineId: string): Promise<{
    status: string;
    progress: number;
    currentStage: string;
    results?: any;
  }> {
    const { data } = await this.request(`/pipelines/${pipelineId}/status`);
    return data;
  }

  async getPipelineResults(pipelineId: string): Promise<any> {
    const { data } = await this.request(`/pipelines/${pipelineId}/results`);
    return data;
  }

  // Recent Activity
  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const { data } = await this.request<any[]>(
      `/activity/recent?limit=${limit}`,
      { method: 'GET' },
      true,
      60 * 1000 // Cache for 1 minute
    );
    return data;
  }

  // User Profile
  async getUserProfile(): Promise<any> {
    const { data } = await this.request('/users/me', { method: 'GET' }, true);
    return data;
  }

  async updateUserProfile(updates: Record<string, any>): Promise<any> {
    const { data } = await this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }
}

// Singleton instance
export const api = new ApiService();

export default api;
