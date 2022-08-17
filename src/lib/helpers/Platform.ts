import type {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import { APIEvent } from 'homebridge';
import { Config } from '../types';

import handleSwitchGroups, {
  type SwitchGroupController,
} from '../controllers/switch-groups';

import type { AccessoryCreationParams } from './Accessory';
import { PLATFORM_NAME, PLUGIN_NAME } from '../../settings';

/**
 * Represents the platform of the plugin.
 */
export class Platform implements DynamicPlatformPlugin {
  public readonly Service = this.api.hap.Service;
  public readonly Characteristic = this.api.hap.Characteristic;

  public readonly hap = this.api.hap;

  public readonly config: Config;

  // this is used to track restored cached accessorie

  public readonly accessories = new Map<
    PlatformAccessory['UUID'],
    PlatformAccessory<AccessoryCreationParams>
  >();

  public get uuids() {
    return new Set(this.accessories.keys());
  }

  public get activeAccessories() {
    return Array.from(this.accessories.values());
  }

  /**
   * Contains a list of all group controllers.
   */

  public controllers = {
    switchGroups: new Set<SwitchGroupController>(),
  };

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = config as Config;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.log.info(JSON.stringify(config, null, 2));

    if (config.logging === 'verbose') {
      this.log.info(JSON.stringify(config, null, 2));
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      log.debug('Executed didFinishLaunching callback');

      // run the method to discover / register your devices as accessories
      // Sets the API configuration
      handleSwitchGroups(this);
    });
  }

  removeAllAccessories() {
    this.api.unregisterPlatformAccessories(
      PLUGIN_NAME,
      PLATFORM_NAME,
      this.activeAccessories,
    );
    this.accessories.clear();
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<AccessoryCreationParams>) {
    this.log.info(
      'Loading accessory from cache:',
      accessory.UUID,
      `${accessory.context.name}-${accessory.context.subType ?? ''}`,
      accessory,
    );

    accessory.on(this.hap.AccessoryEventTypes.IDENTIFY, () => {
      this.log.info('%s identified!', accessory.displayName);
    });

    if (Array.from(this.accessories.keys()).includes(accessory.UUID)) {
      this.log.info('Accessory already registered:', accessory.UUID);
    }

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }
}
