import type {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

// import handleSwitchGroups, {
//   type SwitchGroupController,
// } from '../controllers/switch-groups';

import type { AccessoryCreationParams } from './Accessory';

// import type { Config } from '../types';

/**
 * Represents the platform of the plugin.
 */
export class Platform implements DynamicPlatformPlugin {
  public readonly Service = this.api.hap.Service;
  public readonly Characteristic = this.api.hap.Characteristic;

  public readonly hap = this.api.hap;

  // this is used to track restored cached accessories
  public readonly accessories = new Map<
    PlatformAccessory['UUID'],
    PlatformAccessory<AccessoryCreationParams>
  >();

  /**
   * Contains a list of all group controllers.
   */

  public controllers = {
    switchGroups: [] as any[],
  };

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.log.info(JSON.stringify(config, null, 2));

    if (config.logging === 'verbose') {
      this.log.info(JSON.stringify(config, null, 2));
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      // Sets the API configuration
      // handleSwitchGroups(this);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<AccessoryCreationParams>) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }
}
