import type {
  CharacteristicValue,
  Service as AccessoryService,
  Characteristic as ServiceCharacteristic,
} from 'homebridge';
import { CharacteristicWithUUID, ServiceWithUUID } from '../types';
import type { Accessory } from './Accessory';

import { Characteristic } from './Characteristic';

export type ServiceCreationParams = {
  type: ServiceWithUUID;
  name: string;
  uuid: string;
  subType?: string;
};

export class Service {
  public api = this.accessory.api;
  public platform = this.accessory.platform;
  public log = this.accessory.log;

  public controller: AccessoryService;

  // this is used to track restored cached accessories
  public readonly characteristics = new Map<
    ServiceCharacteristic['UUID'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Characteristic<any>
  >();

  constructor(
    public accessory: Accessory,
    public params: ServiceCreationParams,
  ) {
    const cachedService = params.subType
      ? accessory.controller.getServiceById(params.type, params.subType) ??
        accessory.controller.getServiceById(params.name, params.subType)
      : accessory.controller.getService(params.type) ??
        accessory.controller.getService(params.name);

    if (!cachedService) {
      this.log.info('[Controls] Creating new service', params.name);
    }

    this.controller =
      cachedService ??
      accessory.controller.addService(params.type, params.name, params.subType);
  }

  /**
   * Defines a characteristic for usage with the service. When defining a characteristic, it is marked as used and thus not removed from HomeKit after the initialization.
   * @param type The type of the characteristic.
   * @param value The initial value. If omitted, the cached value is used.
   */
  public useCharacteristic<V extends CharacteristicValue>(
    type: CharacteristicWithUUID,
    value?: V,
  ): Characteristic<V> {
    // Checks if the characteristic has already been defined for usage
    const cachedCharacteristic = this.characteristics.get(type.UUID);

    if (cachedCharacteristic) {
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
    const characteristics = [...this.controller.characteristics];

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
          `[${
            this.platform.config.name ?? 'Controls'
          }] Removing unused characteristic`,
          characteristic.displayName,
        );

        this.controller.removeCharacteristic(characteristic);
      }
    }
  }
}
