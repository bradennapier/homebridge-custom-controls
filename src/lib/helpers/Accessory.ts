import type {
  API,
  Logger,
  Categories,
  PlatformAccessory,
  Service as AccessoryService,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from '../../settings';
import { AccessoryInformation, ServiceWithUUID } from '../types';
import type { Platform } from './Platform';

import { Service } from './Service';

export type AccessoryCreationParams = {
  name: string;
  uuid: string;
  subType?: string;
  category?: Categories;
};

export class Accessory {
  public controller: PlatformAccessory<AccessoryCreationParams>;
  public log: Logger = this.platform.log;
  public api: API = this.platform.api;
  public params: Omit<AccessoryCreationParams, 'subType'> & {
    subType: string;
  };

  // this is used to track restored cached accessories
  public readonly services = new Map<string, Service>();

  constructor(public platform: Platform, params: AccessoryCreationParams) {
    this.params = {
      ...params,
      subType: params.subType ?? 'accessory',
    };
    const uuid = this.api.hap.uuid.generate(this.id);

    const cachedAccessory = this.platform.accessories.get(uuid);

    if (cachedAccessory) {
      this.log.info('Found Cached Accesory');
      this.controller = cachedAccessory;
    } else {
      this.log.info('Creating New Accessory');
      this.controller = new this.api.platformAccessory(
        params.name,
        uuid,
        params.category,
      );

      Object.assign(this.controller.context, params);
      this.register();
    }
  }

  public get id() {
    return `${this.params.uuid}-${this.params.subType}`;
  }

  public isAccessoryRegistered() {
    return this.platform.accessories.has(this.controller.UUID);
  }

  public register(): void {
    this.log.info('Registering accessory', this.controller.displayName);

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      this.controller,
    ]);

    // add the accessory to the accessories cache
    this.platform.accessories.set(this.controller.UUID, this.controller);
  }

  /**
   * Updates the accessory information service.
   * @param information The accessory information.
   */
  public setInformation(information: AccessoryInformation) {
    const service = this.useService(
      this.platform.Service.AccessoryInformation,
      this.params.name,
    );
    // Updates the information characteristics
    if (information.manufacturer) {
      service.useCharacteristic(
        this.platform.api.hap.Characteristic.Manufacturer,
        information.manufacturer,
      );
    }
    if (information.model) {
      service.useCharacteristic(
        this.platform.api.hap.Characteristic.Model,
        information.model,
      );
    }
    if (information.serialNumber) {
      service.useCharacteristic(
        this.platform.api.hap.Characteristic.SerialNumber,
        information.serialNumber,
      );
    }
    if (information.firmwareRevision) {
      service.useCharacteristic(
        this.platform.api.hap.Characteristic.FirmwareRevision,
        information.firmwareRevision,
      );
    }
    if (information.hardwareRevision) {
      service.useCharacteristic(
        this.platform.api.hap.Characteristic.HardwareRevision,
        information.hardwareRevision,
      );
    }
  }

  /**
   * Defines a service for usage with the accessory. When defining a service, it is marked as used and thus not removed from HomeKit after the initialization.
   * @param type The type of the service.
   * @param name The name that should be displayed in HomeKit.
   * @param subType The sub type of the service. May be omitted if the type is already unique.
   */
  public useService(type: ServiceWithUUID, name: string, subType): Service {
    const serviceUUID = `${name}-${subType ?? ''}`;

    // Checks if the service has already been defined for usage
    const cachedService = this.services.get(serviceUUID);

    if (cachedService) {
      this.log.info('Cached Service: ', serviceUUID, cachedService);
      return cachedService;
    }

    // Creates a new service and returns it
    const service = new Service(this, {
      type,
      uuid: serviceUUID,
      name,
      subType,
    });

    this.services.set(serviceUUID, service);

    return service;
  }

  /**
   * Removes all cached services that have not been defined for usage.
   */
  public cleanupServices() {
    const services = [...this.controller.services];

    this.log.info(
      'Cleaning up services',
      services.map((service) => ({
        uuid: service.UUID,
        name: service.name,
        subtype: service.subtype,
      })),
    );

    const cachedServices = [...this.services.values()];

    for (const service of services) {
      // The accessory information service is always required
      if (service.UUID === this.platform.Service.AccessoryInformation.UUID) {
        continue;
      }

      this.log.info(
        `Checking ${service.UUID} / ${
          service.subtype ?? 'null'
        } for removal against: `,
        this.services,
      );

      // Removes the unused services
      if (service.subtype) {
        if (
          !cachedServices.some(
            (d) =>
              service.UUID === d.controller.UUID &&
              service.subtype === d.controller.subtype,
          )
        ) {
          this.log.info(`Removing ${service.UUID}`);
          this.controller.removeService(service);
        }
      } else {
        if (
          !cachedServices.some(
            (d) => service.UUID === d.controller.UUID && !d.controller.subtype,
          )
        ) {
          this.log.info(`Removing ${service.UUID}`);
          this.controller.removeService(service);
        }
      }

      // const cachedService = this.services.get(uuid);

      // if (!cachedService) {
      //   this.log.info('Removing unused service', activeService.displayName);

      //   this.controller.removeService(activeService);
      // }
    }
  }
}
