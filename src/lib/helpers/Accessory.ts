import type { API, Logger, Categories, PlatformAccessory } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from '../../settings';
import { AccessoryInformationBehavior } from '../behaviors';
import { ServiceNameBehavior } from '../behaviors/ServiceNameBehavior';
import type {
  AccessoryInformation,
  AnyObj,
  ServiceBehaviorsParam,
  ServiceWithUUID,
} from '../types';
import type { Platform } from './Platform';

import { Service } from './Service';

export type AccessoryCreationParams = {
  name: string;
  subType?: string;
  category?: Categories;
};

export type AccessoryContext = AccessoryCreationParams & {
  services: {
    [uuid: string]: Record<string, any>;
  };
};

export class Accessory {
  public readonly controller: PlatformAccessory<AccessoryContext>;
  public readonly log: Logger = this.platform.log;
  public readonly api: API = this.platform.api;

  // this is used to track restored cached accessories
  public readonly services = new Map<string, Service>();
  /**
   * The generated UUID of the accessory at runtime.
   */
  public readonly uuid: string;

  constructor(
    public platform: Platform,
    public params: AccessoryCreationParams,
  ) {
    const uuid = this.generateUUID();
    this.uuid = uuid;

    const cachedAccessory = this.platform.accessories.get(uuid);

    if (cachedAccessory) {
      this.log.info(
        'Found Cached Accesory: ',
        JSON.stringify(cachedAccessory.context, null, 2),
      );
      this.controller = cachedAccessory;
      this.controller.context.services ??= {};
    } else {
      this.controller = new this.api.platformAccessory(
        params.name,
        uuid,
        params.category,
      );

      // this.log.info('Created New Accessory: ', {
      //   currentUID: uuid,
      //   currentID:
      //     this.params.subType ?? `${this.params.name}-${this.controller.UUID}`,
      //   cached: [...this.platform.accessories.values()].map((acc) => ({
      //     cachedID: acc.context.subType ?? `${acc.context.name}-${acc.UUID}`,
      //   })),
      // });

      Object.assign(this.controller.context, params);
      this.controller.context.services ??= {};
      this.register();
    }

    this.platform.configuredAccessories.add(uuid);
  }

  private generateUUID() {
    return this.api.hap.uuid.generate(
      this.params.subType ?? `${this.params.name}-${this.controller.UUID}`,
    );
  }

  public isAccessoryRegistered() {
    return this.platform.accessories.has(this.uuid);
  }

  public register(): void {
    this.log.info('Registering accessory', this.controller.displayName);

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      this.controller,
    ]);

    // add the accessory to the accessories cache
    this.platform.accessories.set(this.uuid, this.controller);
  }

  /**
   * Updates the accessory information service.
   * @param information The accessory information.
   */
  public setInformation(information: AccessoryInformation) {
    this.useService(
      this.platform.Service.AccessoryInformation,
      this.params.name,
      undefined,
      {
        behaviors: [[AccessoryInformationBehavior, information]],
      },
    );
  }

  /**
   * Defines a service for usage with the accessory. When defining a service, it is marked as used and thus not removed from HomeKit after the initialization.
   * @param type The type of the service.
   * @param name The name that should be displayed in HomeKit.
   * @param subType The sub type of the service. May be omitted if the type is already unique.
   */
  public useService<ITEM extends AnyObj | undefined = undefined>(
    type: ServiceWithUUID,
    name: string,
    subType?: string,
    params?: {
      config?: ITEM;
      behaviors?: ReadonlyArray<ServiceBehaviorsParam>;
    },
  ): Service {
    const serviceUUID = this.api.hap.uuid.generate(
      `${subType ?? name}-${type.UUID}`,
    );

    // Checks if the service has already been defined for usage
    const cachedService = this.services.get(serviceUUID);

    // this.log.info('USE SERVICE: ', serviceUUID, cachedService);

    if (cachedService) {
      // this.log.info('Cached Service: ', serviceUUID, cachedService);
      return cachedService;
    }

    this.controller.context.services[serviceUUID] ??= {};

    // Creates a new service and returns it
    const service = new Service<ITEM>(this, {
      type,
      uuid: serviceUUID,
      name,
      subType,
    });

    // this.log.info(`Registered Service: ${name}`, {
    //   subType,
    //   serviceUUID,
    //   type,
    // });

    this.services.set(serviceUUID, service);

    if (params?.behaviors) {
      this.log.info('Adding Behaviors: ', params.behaviors);
      params.behaviors.forEach((behavior) => {
        const [ServiceBehavior, params] = Array.isArray(behavior)
          ? behavior
          : [behavior, undefined];

        // hack due to typing still being enforced on both sides of this call
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (ServiceBehavior as any)(service, params);
      });
    } else {
      this.log.info('No Behaviors discovered');
    }

    new ServiceNameBehavior(service, undefined);

    return service;
  }

  /**
   * Removes all cached services that have not been defined for usage.
   */
  public cleanupServices() {
    const services = [...this.controller.services];

    this.log.info('Cleaning up services');

    const cachedServices = [...this.services.values()];

    for (const service of services) {
      // The accessory information service is always required
      if (service.UUID === this.platform.Service.AccessoryInformation.UUID) {
        continue;
      }

      this.log.info(
        `Checking ${service.UUID} / ${service.displayName} / ${
          service.subtype ?? 'null'
        } for removal against: `,
        Array.from(this.services.keys()),
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
          this.log.info(
            `Removing ${service.UUID} - ${service.subtype} - no cached accessories have the same value: `,
            {
              cachedValues: cachedServices.map((s) => s.params.subType),
            },
          );
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

    const persistedIDs = Object.keys(this.controller.context.services ?? {});

    const retainPersistedIDs = cachedServices.map((service) => service.uuid);

    persistedIDs.forEach((id) => {
      if (!retainPersistedIDs.includes(id)) {
        this.log.info(`Removing persisted state for service: ${id}`);
        delete this.controller.context.services[id];
      }
    });

    // cachedServices.forEach((service) => {
    //   service.removeUnusedCharacteristics();
    // });
  }
}
