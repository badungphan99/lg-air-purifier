import { type CharacteristicValue, type PlatformAccessory, type Service } from 'homebridge';
import type { LGAirPurifierPlatform } from './platform.js';

enum FanSpeed {
  // AUTO = 0,
  LOW = 25,
  MID = 50,
  HIGH = 75,
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
  private airPurifierService: Service;
  private airQualitySensorService: Service;
  constructor(
    private readonly platform: LGAirPurifierPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.device.deviceInfo.modelName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.deviceId.slice(-16));

    this.airPurifierService = this.accessory.getService(this.platform.Service.AirPurifier) || this.accessory.addService(this.platform.Service.AirPurifier);
    this.airPurifierService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceInfo.alias);
    this.airPurifierService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.changeRotationSpeed.bind(this)).setProps({ minValue: 0, maxValue: 100, minStep: 25 });
    
    this.airQualitySensorService = this.accessory.getService(this.platform.Service.AirQualitySensor) ||
      this.accessory.addService(this.platform.Service.AirQualitySensor);

    setInterval(() => {
      this.getDeviceState();

      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active,
        this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
          ? this.platform.Characteristic.Active.ACTIVE
          : this.platform.Characteristic.Active.INACTIVE);
      
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed,
        FanSpeed[this.accessory.context.device.data.airFlow.windStrength]);
      
      this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.AirQuality,
        AirQualityStatus[this.accessory.context.device.data.airQualitySensor.totalPollutionLevel]);
      this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.PM2_5Density,
        this.accessory.context.device.data.airQualitySensor.PM2);
      this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.PM10Density,
        this.accessory.context.device.data.airQualitySensor.PM10);
    }, 10000);
  }


  private async getDeviceState() {
    this.accessory.context.device.data = await this.platform.thingQ.getDeviceState(this.accessory.context.device.deviceId);
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  async setOn(value: CharacteristicValue) {
    if (value === this.platform.Characteristic.Active.ACTIVE) {
      this.platform.thingQ.setDeviceState(this.accessory.context.device.deviceId, 'POWER_ON');
    } else {
      this.platform.thingQ.setDeviceState(this.accessory.context.device.deviceId, 'POWER_OFF');
    };
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active, value);
  }

  async changeRotationSpeed(value: CharacteristicValue) {
    this.platform.thingQ.setDeviceRotationSpeed(this.accessory.context.device.deviceId, FanSpeed[value as number]);
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, value);
  }
}