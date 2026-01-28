/**
 * CroweLM API Client
 * Handles communication with the CroweLM backend services
 */

import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_URL = 'http://localhost:12434/v1';

class APIClient {
  private apiUrl: string = DEFAULT_API_URL;
  private nvidiaKey: string = '';

  async initialize() {
    try {
      const savedUrl = await SecureStore.getItemAsync('api_url');
      const savedKey = await SecureStore.getItemAsync('nvidia_key');

      if (savedUrl) this.apiUrl = savedUrl;
      if (savedKey) this.nvidiaKey = savedKey;
    } catch (error) {
      console.error('Failed to load API settings:', error);
    }
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  setNvidiaKey(key: string) {
    this.nvidiaKey = key;
  }

  async chat(message: string, model: string = 'crowelogic/crowelogic:v1.0'): Promise<string> {
    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are CroweLM Biotech, an elite AI assistant specialized in biotechnology,
pharmaceutical research, and drug discovery. Provide detailed, accurate scientific information.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async getModels(): Promise<any[]> {
    const response = await fetch(`${this.apiUrl}/models`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async analyzeTarget(targetId: string): Promise<any> {
    // This would call the backend pipeline API
    // For now, return a mock response
    return {
      target_id: targetId,
      status: 'completed',
      uniprot: {
        gene: 'BRAF',
        protein_name: 'Serine/threonine-protein kinase B-raf',
        organism: 'Homo sapiens',
      },
      druggability_score: 0.85,
    };
  }

  async generateMolecules(
    numMolecules: number = 10,
    seedSmiles?: string
  ): Promise<any[]> {
    // This would call the NVIDIA NIMs API through the backend
    // For now, return mock molecules
    return [
      { smiles: 'CC(=O)Oc1ccccc1C(=O)O', qed: 0.55 },
      { smiles: 'CCO', qed: 0.41 },
      { smiles: 'c1ccccc1', qed: 0.44 },
    ];
  }

  async predictStructure(sequence: string): Promise<any> {
    // This would call ESMFold through NVIDIA NIMs
    return {
      status: 'completed',
      pdb_generated: true,
    };
  }
}

export const apiClient = new APIClient();
