import type { Platform } from '../platform';
import type { Characteristic, Service, PlatformAccessory } from 'homebridge';
import type { Config, SwitchConfig, SwitchGroup } from '../types';
import { PLATFORM_NAME, PLUGIN_NAME } from '../../settings';

const SWITCH_GROUP_SUBTYPE = 'switchGroup';

type SwitchAccessoryContext = {
  uuid: string;
  subType: 'switchGroup';
};

/**
 * Represents a controller for a single group. A group consists of multiple switches and acts as a radio button group.
 */
export class SwitchGroupController {
  private accessory: PlatformAccessory;

  /**
   * Contains the characteristics of all switches and their configurations.
   */
  private onHandlers = new Map<
    string,
    {
      item: SwitchConfig;
      handler: Characteristic;
      timeoutId?: ReturnType<typeof setTimeout>;
    }
  >();

  /**
   * Initializes a new GroupController instance.
   * @param platform The plugin platform.
   * @param group The configuration of the group that is represented by this controller.
   */
  constructor(private platform: Platform, private group: SwitchGroup) {
    platform.log.info(`[group/${group.name}] Initializing Group...`);

    const uuid = platform.api.hap.uuid.generate(`switchGroup-${group.name}`);

    const cachedAccessory = platform.accessories.get(uuid);

    if (!cachedAccessory) {
      // create a new accessory
      this.accessory =
        new platform.api.platformAccessory<SwitchAccessoryContext>(
          group.name,
          uuid,
        );
      this.accessory.context.uuid = uuid;
      this.accessory.context.subType = SWITCH_GROUP_SUBTYPE;
      // register the accessory
      platform.registerAccessory(this.accessory);
    } else {
      this.accessory = cachedAccessory;
    }

    this.accessory.setInformation({
      manufacturer: 'Switch',
      model: 'SwitchGroup',
      serialNumber: group.name,
      firmwareRevision: null,
      hardwareRevision: null,
    });

    // Creates all switches of the controller
    for (const item of group.switches) {
      platform.log.info(`[${group.name}] Adding switch ${item.name}`);

      // Creates the service and characteristic
      const service = this.getSwitchService(item);

      if (!service) {
        this.platform.log.error(
          `[SwitchGroupController] Configured switch ${item.name} in group ${group.name} has invalid displayAs value: ${group.displayAs} ` +
            this.group.displayAs,
        );
        break;
      }

      const onHandler = service.useCharacteristic<boolean>(
        this.platform.Characteristic.On,
      );

      this.onHandlers.set(item.name, {
        item: item,
        handler: onHandler,
      });

      // Subscribes for changes of the switch state
      onHandler.valueChanged = (newValue) => {
        if (onHandler.value !== newValue) {
          platform.log.info(
            `[${group.name}] switch ${item.name} changed to ${newValue}`,
          );

          // Starts the timeout if the switch is on
          if (newValue && typeof item.timeoutSeconds === 'number') {
            this.updateTimeout(item);
          }

          onHandler.value = newValue;
        }
      };
    }

    this.accessory.removeUnusedServices();
  }

  private getSwitchService(item: SwitchConfig): null | Service {
    switch (this.group.displayAs) {
      case 'locks':
        return this.useService(
          this.platform.Service.LockMechanism,
          item.name,
          `${item.name}-${SWITCH_GROUP_SUBTYPE}-lock`,
        );
      case 'power':
        return this.useService(
          this.platform.Service.Outlet,
          item.name,
          `${item.name}-${SWITCH_GROUP_SUBTYPE}-outlet`,
        );
      case 'switches':
        return this.useService(
          this.platform.Service.Switch,
          item.name,
          `${item.name}-switch`,
        );
      default:
        return null;
    }
  }

  private useService(
    serviceKind: typeof Service,
    name: string,
    subType: string,
  ) {
    const service = this.accessory.getService(name);
    if (!service || service?.subtype !== subType) {
      return this.accessory.addService(serviceKind, name, subType);
    }
    return service;
  }

  /**
   * Clears the existing timeout and sets a new timeout for the specified switch.
   * @param item The configuration of the switch for which the new timeout is set (if configured).
   */
  private updateTimeout(item: SwitchConfig) {
    const config = this.onHandlers.get(item.name);

    if (!config) {
      this.platform.log.warn(
        `[SwitchGroup/${this.group.name}] no config found for switch ${item.name}`,
      );
      return;
    }

    clearTimeout(config.timeoutId);

    if (!item.timeoutSeconds) {
      return;
    }

    config.timeoutId = setTimeout(() => {
      this.platform.log.info(`Timeout Period Expires for ${item.name}`);
    }, item.timeoutSeconds * 1000);
  }
}

export default function handleSwitchGroups(platform: Platform) {
  const { switchGroups = [] } = platform.config as Config;

  // Cycles over all configured groups and creates the corresponding controllers
  for (const group of switchGroups) {
    if (group.name && group.switches) {
      // Checks whether the switches are configured properly
      if (group.switches.some((s) => !s.name)) {
        platform.log.warn(
          `[${group.name}] Switches are not configured properly.`,
        );
        continue;
      }

      // Creates a new controller for the group
      const controller = new SwitchGroupController(platform, group);
      platform.controllers.switchGroups.push(controller);
    } else {
      platform.log.warn('Group name missing in the configuration.');
    }
  }
}
