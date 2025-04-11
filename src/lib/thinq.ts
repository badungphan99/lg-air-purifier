import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import type { Logging, CharacteristicValue } from 'homebridge';

export class ThingQ {
  private pat: string;
  private apiUrl:string;
  private client!: AxiosInstance;


  constructor(
    public readonly log: Logging,
    public readonly region: string,
    public readonly country_code: string,
    public readonly token: string,
  ) {
    this.apiUrl = `https://api-${this.region}.lgthinq.com`;
    this.pat = token;
    this.client = axios.create({
      baseURL: this.apiUrl,
    });
  }

  async getDevices(): Promise<JSON> {
    const headers: RawAxiosRequestHeaders = {
      'Authorization' : `Bearer ${this.pat}`,
      'x-message-id': 'fNvdZ1brTn-wWKUlWGoSVw',
      'x-country': this.country_code,
      'x-client-id': 'LG-THINQ',
      'x-api-key': 'v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3',
    };
    const response: AxiosResponse = await this.client.get('/devices', {
      headers,
    });
    if (response.status !== 200) {
      this.log.error('Error fetching devices:', response.status, response.statusText);
      return JSON.parse('{"error": "Error fetching devices"}');
    }
    return response.data.response;
  }

  async getDeviceState(deviceId: string): Promise<JSON> {
    const headers: RawAxiosRequestHeaders = {
      'Authorization' : `Bearer ${this.pat}`,
      'x-message-id': 'fNvdZ1brTn-wWKUlWGoSVw',
      'x-country': this.country_code,
      'x-client-id': 'LG-THINQ',
      'x-api-key': 'v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3',
    };
    const response: AxiosResponse = await this.client.get(`/devices/${deviceId}/state`, {
      headers,
    });
    if (response.status !== 200) {
      this.log.error('Error fetching devices:', response.status, response.statusText);
      return JSON.parse('{"error": "Error fetching devices"}');
    }
    return response.data.response;
  }

  async setDeviceState(deviceId: string, state: CharacteristicValue): Promise<boolean> {
    const headers: RawAxiosRequestHeaders = {
      'Authorization' : `Bearer ${this.pat}`,
      'x-message-id': 'fNvdZ1brTn-wWKUlWGoSVw',
      'x-country': this.country_code,
      'x-client-id': 'LG-THINQ',
      'x-api-key': 'v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3',
      'x-conditional-control': 'true',
    };
    let state_string = 'POWER_OFF';
    if (state === 1) {
      state_string = 'POWER_ON';
    }
    const data = { 'operation': { 'airPurifierOperationMode': `${state_string}` } };
    const response: AxiosResponse = await this.client.post(`/devices/${deviceId}/control`, data, {
      headers,
    });
    if (response.status === 200) {
      return true;
    }
    this.log.error('Error setting device state:', response.status, response.statusText);
    return false;
  }
}