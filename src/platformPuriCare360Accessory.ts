import { type CharacteristicValue, type PlatformAccessory, type Service } from 'homebridge';
import type { LGAirPurifierPlatform } from './platform.js';

enum FanSpeed {
  AUTO = 20,
  LOW = 40,
  MID = 60,
  HIGH = 80,
  POWER = 100,
}

enum AirQualityStatus {
  INVALID = 0, // Unknown
  // EXCELLENT
  GOOD = 2, // GOOD
  NORMAL = 3, // FAIR
  BAD = 4, // INFERIOR
  VERY_BAD = 5, // POOR
}

export class Puricare360Accessory {
  private service: Service;
  private interval: number;
  private lastUpdate: EpochTimeStamp;
  exampleState = {
    active: 1,
    curentState: 3,
    targetState: 2,
    currentTemperature: 30,
  };
  constructor(
    private readonly platform: LGAirPurifierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.interval = this.platform.config.interval * 1000 || 30000;
    this.lastUpdate = 0;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.deviceInfo.modelName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.deviceId.slice(-16));

    this.service = this.accessory.getService(this.platform.Service.HeaterCooler) || 
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(async (value: CharacteristicValue) => {
        this.platform.log.debug('Set Active ->', value);
        this.exampleState.active = value as number;
        this.service.updateCharacteristic(this.platform.Characteristic.Active, value);
      })
      .onGet(() => {
        this.platform.log.debug('Get Active ->', this.exampleState.active);
        return this.exampleState.active;
      });
    
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => {
        this.platform.log.debug('Get CurrentHeaterCoolerState ->', this.exampleState.curentState);
        return this.exampleState.curentState;
      });

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState).setProps({
      validValues: [2],
    });
    
    // this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
    //   .onGet(() => {
    //     this.platform.log.debug('Get TargetHeaterCoolerState ->', this.exampleState.targetState);
    //     return this.exampleState.targetState;
    //   })
    //   .onSet(async (value: CharacteristicValue) => {
    //     this.platform.log.debug('Set TargetHeaterCoolerState ->', value);
    //     this.exampleState.targetState = value as number;
    //     this.service.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, value);
    //   })
    //   .setProps({
    //     maxValue: 2,
    //   });

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(() => {
        this.platform.log.debug('Get CurrentTemperature ->', this.exampleState.currentTemperature);
        return this.exampleState.currentTemperature;
      });
    
  }
}

  