import type { AccessoryInformation, CharacteristicWithUUID } from '../types';
import { Service } from '../helpers';
import { PACKAGE_VERSION } from '../../settings';
import { LogLevel } from 'homebridge';
import { Behavior } from './AbstractBehavior';
import { UUID } from '../decorators/UUID';

/**
 * Registered on every service, this behavior handles the various characteristics that
 * are required for all accessories to function.  This behavior handles the definitions
 * of the various metadata values on each item such as the Model, Name, Manufacturer.
 */
@UUID('105f3b5e-a27e-4c8c-8ffd-409b9ca6eb3e')
export class AccessoryInformationBehavior extends Behavior<{
  params: AccessoryInformation;
  // state: {}
}> {
  public readonly name = this.constructor.name;

  protected readonly type = {
    Manufacturer: this.platform.Characteristic.Manufacturer,
    Model: this.platform.Characteristic.Model,
    SerialNumber: this.platform.Characteristic.SerialNumber,
    FirmwareRevision: this.platform.Characteristic.FirmwareRevision,
    HardwareRevision: this.platform.Characteristic.HardwareRevision,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.type),
  ]);

  protected get $state() {
    return this.State;
  }

  public get state() {
    return this.$state as Readonly<typeof this.$state>;
  }

  constructor(...args: [Service, AccessoryInformation]) {
    super(...args);
    this.registerCharacteristics();
    this.startSubscriptions();
  }

  protected startSubscriptions() {
    this.getAllCharacteristics().forEach((characteristic) => {
      characteristic.onGet((_context, _state) => {
        switch (characteristic.controller.UUID) {
          case this.platform.Characteristic.Manufacturer.UUID:
            return this.service.accessory.params.name;
          case this.platform.Characteristic.Model.UUID:
            return this.service.accessory.params.subType;
          case this.platform.Characteristic.SerialNumber.UUID:
            return this.service.accessory.uuid;
          case this.platform.Characteristic.FirmwareRevision.UUID:
            return PACKAGE_VERSION;
          case this.platform.Characteristic.HardwareRevision.UUID:
            return null;
          default:
            this.log(
              LogLevel.WARN,
              `[AccessoryInformationBehavior] Unknown Information Characteristic: ${characteristic.name}`,
            );
            return new Error(
              `[AccessoryInformationBehavior] Unknown Information Characteristic: ${characteristic.name}`,
            );
        }
      });
    });
  }
}
