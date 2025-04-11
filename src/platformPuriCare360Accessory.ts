import { Characteristic, type CharacteristicValue, type PlatformAccessory, type Service } from 'homebridge';

import type { LGAirPurifierPlatform } from './platform.js';

import { ThingQ } from './lib/thinq.js';

export class Puricare360Accessory {
  // private service: Service;
  private airPurifierService: Service;
  private airQualitySensorService: Service;
  constructor(
    private readonly platform: LGAirPurifierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.deviceInfo.modelName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.deviceId);

    this.airPurifierService = this.accessory.getService(this.platform.Service.AirPurifier) || this.accessory.addService(this.platform.Service.AirPurifier);
    this.airPurifierService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceInfo.alias);
    this.airPurifierService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.changeRotationSpeed.bind(this));
    
    this.airPurifierService.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .onSet(this.changeAirPurifierState.bind(this));

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.FilterLifeLevel);

    this.airQualitySensorService = this.accessory.getService(this.platform.Service.AirQualitySensor) || 
      this.accessory.addService(this.platform.Service.AirQualitySensor);
    
    this.airQualitySensorService.getCharacteristic(this.platform.Characteristic.AirQuality).onGet(this.getAirQuality.bind(this));
  }

  async getOn(): Promise<CharacteristicValue> {
    const state = Object(await this.platform.thingQ.getDeviceState(this.accessory.context.device.deviceId)).operation.airPurifierOperationMode;
    this.platform.log.debug('getOn: ' + state);
    if (state === 'POWER_ON') {
      return this.platform.Characteristic.Active.ACTIVE;
    }
    return this.platform.Characteristic.Active.INACTIVE;
  }

  async setOn(value: CharacteristicValue) {
    this.platform.thingQ.setDeviceState(this.accessory.context.device.deviceId, value);
    // this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active, value);
    // this.platform.log.info('Set Active to ' + value);
  }

  async changeRotationSpeed(value: CharacteristicValue) {
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, value);
    this.platform.log.info('Set RotationSpeed to ' + value);
  }

  async changeAirPurifierState(value: CharacteristicValue) {
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, value);
    this.platform.log.info('Set CurrentAirPurifierState to ' + value);
  }

  async getAirQuality(): Promise<CharacteristicValue> {
    return this.platform.Characteristic.AirQuality.GOOD;
  }
}