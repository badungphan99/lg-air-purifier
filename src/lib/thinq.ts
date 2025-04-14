import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, RawAxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import type { Logging, CharacteristicValue } from 'homebridge';

import * as constants from './constants.js'

export class ThingQ {
  private pat: string;
  private client!: AxiosInstance;


  constructor(
    public readonly log: Logging,
    public readonly region: string,
    public readonly country_code: string,
    public readonly token: string,
  ) {
    this.pat = token;
    this.client = axios.create({
      baseURL: `https://api-${this.region}.lgthinq.com`,
    });
  }

  public async getDevices(): Promise<JSON> {
    const response: AxiosResponse = await this.client.get('/devices', this.defaultHeaders);
    if (response.status !== 200) {
      this.log.error('Error fetching devices:', response.status, response.statusText);
      return JSON.parse('{"error": "Error fetching devices"}');
    }
    return response.data.response;
  }

  public async getDeviceState(deviceId: string): Promise<JSON> {
    const response: AxiosResponse = await this.client.get(`/devices/${deviceId}/state`, this.defaultHeaders);
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

  protected get defaultHeaders(): RawAxiosRequestConfig {
    
    function random_string(l: number) {
      const result: string[] = [];
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      for (let i = 0; i < l; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
      }
      return result.join('');
    }

    const headers: RawAxiosRequestHeaders = {
      'Authorization' : `Bearer ${this.pat}`,
      'x-message-id': random_string(constants.LENGTH_MSG_ID),
      'x-country': this.country_code,
      'x-client-id': constants.X_CLIENT_ID,
      'x-api-key': constants.X_API_KEY,
    }

    return {headers} as AxiosRequestConfig
  }
}