import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { Puricare360Accessory } from './platformPuriCare360Accessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ThingQ } from './lib/thinq.js';

// This is only required when using Custom Services and Characteristics not support by HomeKit
// import { EveHomeKitTypes } from 'homebridge-lib/EveHomeKitTypes';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class LGAirPurifierPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // This is only required when using Custom Services and Characteristics not support by HomeKit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;
  public readonly thingQ!: ThingQ;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    
    if (!this.config) {
      this.log.error('No config provided, please check your config.json file');
      return;
    }
    if (!this.config.region || !this.config.country || !this.config.token) {
      this.log.error('Missing required config values: region, country, token');
      return;
    }
    this.thingQ = new ThingQ(this.log, this.config.region, this.config.country, this.config.token);

    // This is only required when using Custom Services and Characteristics not support by HomeKit
    // this.CustomServices = new EveHomeKitTypes(this.api).Services;
    // this.CustomCharacteristics = new EveHomeKitTypes(this.api).Characteristics;

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    const devices = await this.thingQ.getDevices();
    if ('error' in devices) {
      this.log.error('error fetching devices:', devices.error);
      return;
    }
    for (const device of Object.values(devices)) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.deviceId);

      this.log.debug('Discovered device:', device.deviceId, uuid);

      const existingAccessory = this.accessories.get(uuid);
      // this.log.debug('Existing accessory:', existingAccessory);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        if (device.deviceInfo.deviceType === 'DEVICE_AIR_PURIFIER') {
          new Puricare360Accessory(this, existingAccessory);
        } else {
          new Puricare360Accessory(this, existingAccessory);
        }

      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.deviceInfo.deviceType);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.deviceInfo.alias, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        if (device.deviceInfo.deviceType === 'DEVICE_AIR_PURIFIER') {
          new Puricare360Accessory(this, accessory);
        } else {
          new Puricare360Accessory(this, accessory);
        }

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
