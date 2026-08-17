const API_BASE_URL = 'https://smart-weigh-ocr.onrender.com';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data as T;
  }

  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }

    return data as T;
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request<{ user: any }>('/auth/profile');
  }

  async getBins() {
    return this.request<{ bins: any[] }>('/bins');
  }

  async getBin(binId: string) {
    return this.request<{ bin: any }>(`/bins/${binId}`);
  }

  async createBin(name: string, emptyWeight: number, unit: string, tareImageUrl?: string, ocrConfidence?: number) {
    return this.request<{ bin: any }>('/bins', {
      method: 'POST',
      body: JSON.stringify({
        name,
        empty_weight: emptyWeight,
        unit,
        tare_image_url: tareImageUrl,
        ocr_confidence: ocrConfidence,
      }),
    });
  }

  async updateBinTare(binId: string, emptyWeight: number, unit: string, tareImageUrl?: string, ocrConfidence?: number) {
    return this.request<{ bin: any }>(`/bins/${binId}/tare`, {
      method: 'PUT',
      body: JSON.stringify({
        empty_weight: emptyWeight,
        unit,
        tare_image_url: tareImageUrl,
        ocr_confidence: ocrConfidence,
      }),
    });
  }

  async deleteBin(binId: string) {
    return this.request<{ message: string }>(`/bins/${binId}`, {
      method: 'DELETE',
    });
  }

  async processOCR(imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    return this.uploadRequest<{
      ocr: {
        text: string;
        confidence: number;
        confidence_level: string;
        weight: number | null;
        unit: string | null;
        processing_time_ms: number;
        raw_detections: string[];
      };
      validation: {
        valid: boolean;
        error: string | null;
      };
    }>('/ocr/process', formData);
  }

  async createWeighing(
    binId: string,
    grossWeight: number,
    unit: string,
    ocrConfidence?: number,
    ocrRawResult?: string,
    processingTimeMs?: number,
    imageUrl?: string
  ) {
    return this.request<{ weighing: any }>('/weighings', {
      method: 'POST',
      body: JSON.stringify({
        bin_id: binId,
        gross_weight: grossWeight,
        unit,
        ocr_confidence: ocrConfidence,
        ocr_raw_result: ocrRawResult,
        processing_time_ms: processingTimeMs,
        image_url: imageUrl,
      }),
    });
  }

  async getWeighings(limit?: number, offset?: number, binId?: string) {
    let endpoint = `/weighings?limit=${limit || 50}&offset=${offset || 0}`;
    if (binId) endpoint += `&bin_id=${binId}`;
    return this.request<{ weighings: any[]; total: number }>(endpoint);
  }

  async getWeighing(id: string) {
    return this.request<{ weighing: any }>(`/weighings/${id}`);
  }
}

export const api = new ApiService();
