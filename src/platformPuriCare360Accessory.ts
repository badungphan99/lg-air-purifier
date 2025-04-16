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
  private airPurifierService: Service;
  private airQualitySensorService: Service;
  private sleepModeService: Service;
  private interval: number;
  private lastUpdate: EpochTimeStamp;
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

    this.airPurifierService = this.accessory.getService(this.platform.Service.AirPurifier) || 
      this.accessory.addService(this.platform.Service.AirPurifier);
    this.airPurifierService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceInfo.alias);
    this.airPurifierService.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getOn.bind(this))
      .onSet(this.setOn.bind(this));

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .onGet(this.onGetCurrentAirPurifierState.bind(this));

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .onGet(async () => {
        return this.platform.Characteristic.TargetAirPurifierState.MANUAL;
      });

    this.airPurifierService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.onGetRotationSpeed.bind(this))
      .onSet(this.changeRotationSpeed.bind(this))
      .setProps({ minValue: 0, maxValue: 100, minStep: 20 });
    
    // Register air quality sensor service
    this.airQualitySensorService = this.accessory.getService(this.platform.Service.AirQualitySensor) ||
      this.accessory.addService(this.platform.Service.AirQualitySensor);
    
    // Register sleep mode switch for the air purifier
    this.sleepModeService = this.accessory.getService(this.platform.Service.Switch) || 
      this.accessory.addService(this.platform.Service.Switch);
    this.sleepModeService.setCharacteristic(this.platform.Characteristic.Name, 'Sleep Mode');
    this.sleepModeService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.onGetSleepMode.bind(this))
      .onSet(this.onSetSleepMode.bind(this));

    this.getDeviceState();

    setInterval(async () => {
      await this.getDeviceState();
    }, this.interval / 5);
  }


  private async getDeviceState() {
    try {
      if (this.lastUpdate && (Date.now() - this.lastUpdate) < this.interval) {
        return;
      }
      this.accessory.context.device.data = await this.platform.thingQ.getDeviceState(this.accessory.context.device.deviceId);
      this.lastUpdate = Date.now();
    } catch (error) {
      this.platform.log.error('Error fetching device state:', error);
      return;
    }
    this.platform.log.debug('Device state fetched:', this.accessory.context.device.data);

    // Update Characteristics
    if (this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON') {
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
        this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active,
        this.platform.Characteristic.Active.ACTIVE);
    } else {
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
        this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active,
        this.platform.Characteristic.Active.INACTIVE);
    }
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed,
      FanSpeed[this.accessory.context.device.data.airFlow.windStrength]);
    
    this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.AirQuality,
      AirQualityStatus[this.accessory.context.device.data.airQualitySensor.totalPollutionLevel]);
    this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.PM2_5Density,
      this.accessory.context.device.data.airQualitySensor.PM2);
    this.airQualitySensorService.updateCharacteristic(this.platform.Characteristic.PM10Density,
      this.accessory.context.device.data.airQualitySensor.PM10);

    this.sleepModeService.updateCharacteristic(this.platform.Characteristic.On,
      this.accessory.context.device.data.airPurifierJobMode.currentJobMode === 'SLEEP');
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  async setOn(value: CharacteristicValue) {
    const isTurningOn = value === this.platform.Characteristic.Active.ACTIVE;
    const command = isTurningOn ? 'POWER_ON' : 'POWER_OFF';

    await this.platform.thingQ.setDeviceState(this.accessory.context.device.deviceId, command).then(() => {
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.Active, value);
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState,
        isTurningOn
          ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR
          : this.platform.Characteristic.CurrentAirPurifierState.INACTIVE);
    }).catch((error) => {
      this.platform.log.error('Failed to set device power state:', error);
      throw error;
    });
  }

  async onGetCurrentAirPurifierState(): Promise<CharacteristicValue> {
    return this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
      ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR
      : this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
  }

  async onGetRotationSpeed(): Promise<CharacteristicValue> {
    return FanSpeed[this.accessory.context.device.data.airFlow.windStrength];
  }

  async changeRotationSpeed(value: CharacteristicValue) {
    if (value === 0) {
      this.setOn(this.platform.Characteristic.Active.INACTIVE);
      return;
    }
    await this.platform.thingQ.setDeviceRotationSpeed(this.accessory.context.device.deviceId, FanSpeed[value as number]).then(() => {
      this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, value);
    }).catch((error) => {
      this.platform.log.error('Failed to set rotation speed:', error);
      throw error;
    });
  }

  async onGetSleepMode(): Promise<CharacteristicValue> {
    return this.accessory.context.device.data.airPurifierJobMode.currentJobMode === 'SLEEP'
      ? true : false;
  }

  async onSetSleepMode(value: CharacteristicValue) {
    await this.platform.thingQ.setDeviceSleepMode(this.accessory.context.device.deviceId, value).then(() => {
      this.sleepModeService.updateCharacteristic(this.platform.Characteristic.On, value);
    }).catch((error) => {
      this.platform.log.error('Failed to set sleep mode:', error);
      throw error;
    });
  }
}