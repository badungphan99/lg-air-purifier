import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, RawAxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import type { Logging, CharacteristicValue } from 'homebridge';

import * as constants from './constants.js';

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

  public async getDevices(): Promise<object> {
    return this.makeGetRequest('/devices', 'fetching devices');
  }

  public async getDeviceState(deviceId: string): Promise<object> {
    return this.makeGetRequest(`/devices/${deviceId}/state`, 'fetching device state');
  }

  public async setDeviceState(deviceId: string, state: string): Promise<boolean> {
    const data = {
      operation: {
        airPurifierOperationMode: state,
      },
    };
    return this.makePostRequest(`/devices/${deviceId}/control`, data, 'setting device state');
  }

  async setDeviceRotationSpeed(deviceId: string, speed: CharacteristicValue): Promise<boolean> {
    const data = {
      airFlow: {
        windStrength: speed,
      },
    };
    return this.makePostRequest(`/devices/${deviceId}/control`, data, 'setting device rotation speed');
  }

  public async setDeviceSleepMode(deviceId: string, mode: CharacteristicValue): Promise<boolean> {
    this.log.debug('setDeviceSleepMode', mode);
    const data = {
      'airPurifierJobMode': {
        'currentJobMode': `${mode ? 'SLEEP' : 'CLEAN'}`,
      },
    };
    return this.makePostRequest(`/devices/${deviceId}/control`, data, 'setting sleep mode');
  }

  private async makeGetRequest(endpoint: string, context: string): Promise<object> {
    try {
      const response: AxiosResponse = await this.client.get(endpoint, this.defaultHeaders);
      return response.data.response;
    } catch (error: unknown) {
      this.log.error(`Error ${context}:`, error);
      return { error: `Error ${context}` };
    }
  }

  private async makePostRequest(endpoint: string, data: object, context: string): Promise<boolean> {
    try {
      const response: AxiosResponse = await this.client.post(endpoint, data, this.defaultHeaders);
      this.log.debug(`${context} success:`, data);
      return response.status === 200;
    } catch (error: unknown) {
      this.log.error(`Error ${context}:`, error);
      return false;
    }
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
    };

    return { headers } as AxiosRequestConfig;
  }
}