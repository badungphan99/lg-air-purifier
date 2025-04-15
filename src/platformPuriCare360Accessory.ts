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
    this.lastUpdate = Date.now();

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
      .onSet(this.changeRotationSpeed.bind(this)).setProps({ minValue: 0, maxValue: 100, minStep: 20 });
    
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
    }, this.interval);
  }


  private async getDeviceState() {
    this.platform.log.debug('Fetching device state');
    this.platform.log.debug('Last update:', this.lastUpdate);
    this.platform.log.debug('Curent sate: ', this.accessory.context.device.data);
    if (this.lastUpdate && (Date.now() - this.lastUpdate) < this.interval) {
      this.platform.log.debug('Device state update skipped to avoid rate limit');
      return;
    }
    this.accessory.context.device.data = await this.platform.thingQ.getDeviceState(this.accessory.context.device.deviceId);
    if (this.accessory.context.device.data.error) {
      this.platform.log.error('Error fetching device state:', this.accessory.context.device.data.error);
      return;
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    await this.getDeviceState();
    return this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  async setOn(value: CharacteristicValue) {
    const isTurningOn = value === this.platform.Characteristic.Active.ACTIVE;
    this.platform.log.debug('Set Active to:', value);
  
    const command = isTurningOn ? 'POWER_ON' : 'POWER_OFF';
  
    try {
      await this.platform.thingQ.setDeviceState(this.accessory.context.device.deviceId, command);
      await this.getDeviceState();
  
      const isNowOn = this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON';
  
      this.airPurifierService.updateCharacteristic(
        this.platform.Characteristic.CurrentAirPurifierState,
        isNowOn
          ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR
          : this.platform.Characteristic.CurrentAirPurifierState.INACTIVE,
      );
  
      this.airPurifierService.updateCharacteristic(
        this.platform.Characteristic.Active,
        isNowOn
          ? this.platform.Characteristic.Active.ACTIVE
          : this.platform.Characteristic.Active.INACTIVE,
      );
    } catch (error) {
      this.platform.log.error('Failed to set device power state:', error);
    }
  }

  async onGetCurrentAirPurifierState() {
    await this.getDeviceState();
    return this.accessory.context.device.data.operation.airPurifierOperationMode === 'POWER_ON'
      ? this.platform.Characteristic.CurrentAirPurifierState.PURIFYING_AIR
      : this.platform.Characteristic.CurrentAirPurifierState.INACTIVE;
  }

  async changeRotationSpeed(value: CharacteristicValue) {
    await this.platform.thingQ.setDeviceRotationSpeed(this.accessory.context.device.deviceId, FanSpeed[value as number]);
    this.airPurifierService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, value);
  }

  async onGetSleepMode(): Promise<CharacteristicValue> {
    await this.getDeviceState();
    return this.accessory.context.device.data.airPurifierJobMode.currentJobMode === 'SLEEP'
      ? true : false;
  }

  async onSetSleepMode(value: CharacteristicValue) {
    try {
      await this.platform.thingQ.setDeviceSleepMode(this.accessory.context.device.deviceId, value);
      this.sleepModeService.updateCharacteristic(this.platform.Characteristic.On, value);
    } catch (error) {
      this.platform.log.error('Failed to set sleep mode:', error);
    }
  }
}