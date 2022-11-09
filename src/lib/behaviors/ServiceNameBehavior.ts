import structuredClone from '@ungap/structured-clone';

import type { AccessoryInformation, CharacteristicWithUUID } from '../types';
import { Service } from '../helpers';
import { LogLevel } from 'homebridge';
import { Behavior } from './AbstractBehavior';
import { UUID } from '../decorators/UUID';
// import CustomCharacteristic from '../characteristics/CustomBase';

/**
 * Registered on every service, this behavior handles the various characteristics that
 * are required for all accessories to function.  This behavior handles the definitions
 * of the various metadata values on each item such as the Model, Name, Manufacturer.
 */
@UUID('72530653-aacb-42db-9e1c-8298adb176e0')
export class ServiceNameBehavior extends Behavior<{
  params: AccessoryInformation;
  // state: {}
}> {
  public readonly name = this.constructor.name;

  public readonly type = {
    Name: this.platform.Characteristic.Name,
    ConfiguredName: this.platform.Characteristic.ConfiguredName,
    // CustomCharacteristic: CustomCharacteristic(this.platform),
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.type),
  ]);

  get state() {
    const state = structuredClone(this.State);
    return Object.freeze(state);
  }

  constructor(...args: [Service, undefined]) {
    super(...args);

    this.registerCharacteristics(
      new Map<CharacteristicWithUUID, unknown>([
        [this.type.Name, 'Switch1'],
        [this.type.ConfiguredName, 'Switch1'],
        // [this.type.CustomCharacteristic, 0],
      ]),
    );
    this.startSubscriptions();
  }

  protected startSubscriptions() {
    this.getAllCharacteristics().forEach((characteristic) => {
      characteristic.onGet((_context, _state) => {
        switch (characteristic.controller.UUID) {
          case this.platform.Characteristic.ConfiguredName.UUID:
            return this.service.params.name ?? 'Name Unknown?';
          case this.platform.Characteristic.Name.UUID:
            return this.service.params.name ?? 'Name Unknown?';
          // case this.get(this.type.CustomCharacteristic).controller.UUID:
          //   this.log(LogLevel.INFO, 'CustomCharacteristic onGet');
          //   return state.value ?? state.oldValue ?? state.initialValue;
        }
      });
    });

    const configuredName = this.get(this.type.ConfiguredName);
    const nameProp = this.get(this.type.Name);

    configuredName.onChange((value, context) => {
      this.log(
        LogLevel.INFO,
        ` Configured Name Change Detected: `,
        value,
        context,
      );
    });

    // configuredName.state.setByUser !== true
    if (configuredName.state.updatedBy !== 'user') {
      setTimeout(() => {
        this.log(
          LogLevel.INFO,
          `SET CONFIGURED NAME TO : `,
          this.service.params.name,
        );
        configuredName.setValue(this.service.params.name, { work: 'please' });
        nameProp.setValue(this.service.params.name, { work: 'please' });
        configuredName.controller.setValue(this.service.params.name);
        this.log(
          LogLevel.INFO,
          'Configured Name is now: ',
          configuredName.value,
          configuredName.state,
        );
      }, 1000);
    }
  }
}
