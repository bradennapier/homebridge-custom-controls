import type { Platform } from '../helpers/Platform';
import type { Characteristic } from '../helpers/Characteristic';
import { Accessory } from '../helpers/Accessory';

import type { Config, SwitchConfig, SwitchGroup } from '../types';

import { PACKAGE_VERSION } from '../../settings';
import {
  StateTimeoutBehavior,
  StateBehaviorLock,
  StateBehaviorSwitch,
} from '../behaviors';
import { API, Logger } from 'homebridge';
import { OccupancySensorBehavior } from '../behaviors/OccupancySensorBehavior';

const SUBTYPE = 'switchGroup';

// type SwitchAccessoryContext = {
//   uuid: string;
//   subType: 'switchGroup';
// };

/**
 * Represents a controller for a single group. A group consists of multiple switches and acts as a radio button group.
 */
export class SwitchGroupController {
  private accessory: Accessory;
  public readonly log: Logger = this.platform.log;
  public readonly api: API = this.platform.api;

  /**
   * Contains the characteristics of all switches and their configurations.
   */
  private onHandlers = new Map<
    string,
    {
      item: SwitchConfig;
      handler: Characteristic<boolean>;
      timeoutId?: ReturnType<typeof setTimeout>;
    }
  >();

  /**
   * Initializes a new GroupController instance.
   * @param platform The plugin platform.
   * @param group The configuration of the group that is represented by this controller.
   */
  constructor(private platform: Platform, private group: SwitchGroup) {
    platform.log.info(`[group/${group.name}] Initializing Group...`, group);

    this.accessory = new Accessory(platform, {
      name: group.name,
      subType: `${SUBTYPE}-${group.uniqueID}`,
      category: this.api.hap.Categories.SPRINKLER,
    });

    this.accessory.setInformation({
      manufacturer: group.name,
      model: SUBTYPE,
      serialNumber: group.uniqueID,
      firmwareRevision: PACKAGE_VERSION,
    });

    // Creates all switches of the controller
    for (const item of group.switches) {
      platform.log.info(`[${group.name}] Adding switch ${item.name}`);

      // Creates the service and characteristic
      const service = this.getSwitchService(item);

      if (!service) {
        this.platform.log.error(
          `[SwitchGroupController] Configured switch ${item.name} in group ${group.name} has invalid displayAs value: ${group.displayAs} ${this.group.displayAs}`,
        );
        break;
      }

      // service.removeUnusedCharacteristics();
    }

    // this.accessory.useService(
    //   this.platform.Service.ContactSensor,
    //   'Contact Sensor 1',
    //   `${SUBTYPE}-${group.uniqueID}-cc1`,
    // );

    this.accessory.useService(
      this.platform.Service.OccupancySensor,
      'Occupancy Sensor',
      `${SUBTYPE}-${group.uniqueID}-occupancy`,
      {
        behaviors: [OccupancySensorBehavior],
      },
    );

    this.accessory.cleanupServices();
  }

  private getSwitchService(item: SwitchConfig) {
    const opts = {
      params: {
        config: item,
      },
    };
    const id = `${SUBTYPE}-${this.group.uniqueID}-${
      item.uniqueID ?? item.name
    }-${this.group.displayAs}`;

    switch (this.group.displayAs) {
      case 'locks':
        return this.accessory.useService(
          this.platform.Service.LockMechanism,
          item.name,
          id,
          {
            ...opts,
            behaviors: [StateBehaviorLock, StateTimeoutBehavior],
          },
        );
      case 'power':
        return this.accessory.useService(
          this.platform.Service.Outlet,
          item.name,
          id,
          {
            ...opts,
            behaviors: [StateBehaviorSwitch, StateTimeoutBehavior],
          },
        );
      case 'switches':
        return this.accessory.useService(
          this.platform.Service.Switch,
          item.name,
          id,
          {
            ...opts,
            behaviors: [StateBehaviorSwitch, StateTimeoutBehavior],
          },
        );
      default:
        return null;
    }
  }
}

export default function handleSwitchGroups(platform: Platform) {
  const { switchGroups = [] } = platform.config as Config;

  const uniqueGroupIDs = new Set<string>();

  // Cycles over all configured groups and creates the corresponding controllers
  for (const group of switchGroups) {
    if (uniqueGroupIDs.has(group.uniqueID)) {
      platform.log.error(
        `[SwitchGroupController] Duplicate uniqueID for switch group "${group.uniqueID}" found in config, ignoring group until fixed!`,
      );
      continue;
    }

    uniqueGroupIDs.add(group.uniqueID);

    const uniqueSwitchIDs = new Set<string>();
    let isValidated = true;

    // TODO: if no switches we may just use it for sensors
    if (group.uniqueID && group.name && group.switches) {
      if (Array.isArray(group.switches)) {
        group.switches.forEach((switchConfig) => {
          if (uniqueSwitchIDs.has(switchConfig.uniqueID)) {
            platform.log.error(
              `[SwitchGroupController] Duplicate uniqueID for switch "${switchConfig.uniqueID}" with name ${switchConfig.name}" found in group switchGroup "${group.name}", ignoring switch until fixed!`,
            );
            isValidated = false;
            return;
          }

          uniqueSwitchIDs.add(switchConfig.uniqueID);

          if (!switchConfig.name) {
            platform.log.error(
              `[SwitchGroupController] Switch with uniqueID "${switchConfig.uniqueID}" has no name, ignoring switch until fixed!`,
            );
            isValidated = false;
            return;
          }
        });
      }

      if (isValidated) {
        // Creates a new controller for the group
        const controller = new SwitchGroupController(platform, group);
        platform.controllers.switchGroups.add(controller);
      }
    } else {
      platform.log.warn('Group name missing in the configuration.');
    }
  }
}
