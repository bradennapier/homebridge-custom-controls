import type {
  CharacteristicValue,
  Service as AccessoryService,
  Characteristic as ServiceCharacteristic,
} from 'homebridge';
import type {
  AnyObj,
  CharacteristicWithUUID,
  ServiceWithUUID,
  ServiceBehaviors,
} from '../types';
import type { Accessory } from './Accessory';
import { Behavior } from '../behaviors/AbstractBehavior';

import { Characteristic } from './Characteristic';
import { BehaviorTypes } from '../behaviors/types';
import StateBehavior from '../behaviors/state/AbstractStateBehavior';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceCreationParams<C extends AnyObj | undefined = any> = {
  type: ServiceWithUUID;
  name: string;
  uuid: string;
  subType?: string;
  item?: C;
};

export class Service<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  C extends AnyObj | undefined = any,
  P extends ServiceCreationParams<C> = ServiceCreationParams<C>,
> {
  public api = this.accessory.api;
  public platform = this.accessory.platform;
  public log = this.accessory.log;

  public type = this.params.type;

  public uuid = this.params.uuid;

  public state = this.accessory.controller.context.services[this.uuid] as {
    createdAt: string;
    initialName: string;
    attributes: AnyObj;
    behaviors: AnyObj;
  };

  public controller: AccessoryService;

  public get logName() {
    return `[${this.accessory.controller?.displayName ?? 'UNKNOWN'}] [${
      this.controller?.displayName ??
      this.params.name ??
      this.type.name ??
      'UNKNOWN'
    }]`;
  }

  // this is used to track restored cached accessories
  public readonly characteristics = new Map<
    ServiceCharacteristic['UUID'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Characteristic<any>
  >();

  public readonly behaviors = {
    byUUID: new Map<
      Behavior['UUID'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ServiceBehaviors
    >(),
    types: {} as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [BehaviorTypes.STATE]?: StateBehavior;
    },
  };

  constructor(public accessory: Accessory, public params: P) {
    const cachedService = params.subType
      ? accessory.controller.getServiceById(params.type, params.subType)
      : accessory.controller.getService(params.type);

    if (!cachedService) {
      this.log.info(`${this.logName} Creating new service`, params.name);
    }

    this.controller =
      cachedService ??
      accessory.controller.addService(params.type, params.name, params.subType);

    this.state.attributes ??= {};
    this.state.behaviors ??= {};

    // const initialSetting = false;

    if (
      !this.state.initialName ||
      this.params.name !== this.state.initialName
    ) {
      Object.assign(this.state, {
        createdAt: new Date().toString(),
        initialName: this.params.name,
        attributes: {},
      });
      // initialSetting = true;
    }
  }

  /**
   * Defines a characteristic for usage with the service. When defining a characteristic, it is marked as used and thus not removed from HomeKit after the initialization.
   * @param type The type of the characteristic.
   * @param value The initial value. If omitted, the cached value is used.
   */
  public useCharacteristic<V extends CharacteristicValue>(
    type: CharacteristicWithUUID,
    value?: V,
    isBehavior = false,
  ): Characteristic<V> {
    this.state.attributes[type.UUID] ??= {};

    // this.removeUnusedCharacteristics();
    // Checks if the characteristic has already been defined for usage
    const cachedCharacteristic = this.characteristics.get(type.UUID);

    if (cachedCharacteristic) {
      if (isBehavior) {
        this.log.error(
          `${this.logName} Behavior wants to use a Characteristic (${cachedCharacteristic.controller.displayName}) which is already defined for another behavior.  This is not allowed.`,
        );
        throw new Error(
          `${this.logName} Behavior Characteristic Conflict: ${cachedCharacteristic.controller.displayName}`,
        );
      }
      this.log.info(
        `${this.logName} Returning Cached Characteristic from useCharacteristic request: `,
        type.UUID,
        cachedCharacteristic.logName,
      );
      return cachedCharacteristic;
    }

    // Creates a new characteristic and returns it
    const characteristic = new Characteristic<V>(this, type, value);
    this.characteristics.set(type.UUID, characteristic);

    return characteristic;
  }

  /**
   * Removes all cached characteristics that have not been defined for usage.
   */
  public removeUnusedCharacteristics() {
    const characteristics = [...this.controller.optionalCharacteristics];

    for (const characteristic of characteristics) {
      // The name characteristic is always used by homebridge
      if (characteristic.UUID === this.platform.Characteristic.Name.UUID) {
        continue;
      }

      const cachedCharacteristic = this.characteristics.get(
        characteristic.UUID,
      );

      if (!cachedCharacteristic) {
        this.log.info(
          `${this.logName} Removing unused characteristic`,
          characteristic.displayName,
        );

        this.controller.removeCharacteristic(characteristic);
      }
    }
  }
}
