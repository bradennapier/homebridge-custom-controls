import type { AccessoryInformation, CharacteristicWithUUID } from '../types';
import { Service } from '../helpers';
import { LogLevel } from 'homebridge';
import { Behavior, UUID } from './AbstractBehavior';

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
  public readonly UUID: string = this.UUID;
  public readonly name = this.constructor.name;

  readonly #type = {
    Name: this.platform.Characteristic.Name,
    ConfiguredName: this.platform.Characteristic.ConfiguredName,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.#type),
  ]);

  get #state() {
    return this.State;
  }

  get state() {
    return this.#state as Readonly<typeof this.state>;
  }

  constructor(...args: [Service, AccessoryInformation]) {
    super(...args);
    this.registerCharacteristics(
      new Map([
        [this.#type.Name, this.service.params.name],
        [this.#type.ConfiguredName, this.service.params.name],
      ]),
    );
    this.#startSubscriptions();
  }

  #startSubscriptions() {
    this.getAllCharacteristics().forEach((characteristic) => {
      characteristic.onGet((_context, _state) => {
        switch (characteristic.controller.UUID) {
          case this.platform.Characteristic.ConfiguredName.UUID:
            return this.service.params.name ?? 'Name Unknown?';
          case this.platform.Characteristic.Name.UUID:
            return this.service.params.name ?? 'Name Unknown?';
        }
      });
    });

    const configuredName = this.get(this.#type.ConfiguredName);
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
      }, 1000);
    }
  }
}
