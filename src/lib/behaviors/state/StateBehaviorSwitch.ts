import { LogLevel } from 'homebridge';
import { type Service } from '../../helpers';
import type { CharacteristicWithUUID } from '../../types';
import { UUID } from '../AbstractBehavior';
import StateBehavior from './AbstractStateBehavior';

@UUID('fc85738f-4007-4531-a6d7-934dc2dc31d0')
export class StateBehaviorSwitch extends StateBehavior<{
  state: { one: string };
  // params: undefined;
}> {
  public readonly UUID: string = this.UUID;

  public readonly name = this.constructor.name;

  readonly #type = {
    On: this.platform.Characteristic.On,
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

  constructor(...args: [Service, undefined]) {
    super(...args);
    super.registerCharacteristics();
    this.#startSubscriptions();
  }

  #startSubscriptions() {
    const onChar = this.get(this.#type.On);
    onChar.onChange((newValue) => {
      this.log(
        LogLevel.INFO,
        `switch ${this.service.params.name} changed to ${newValue}`,
      );
      this.#updateTimeout();
    });
  }

  #updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }

  public stateSet(desiredState: boolean): void {
    // set state
    this.log(LogLevel.INFO, `stateSet called to set to: ${desiredState}`);
    this.get(this.#type.On).setValue(desiredState);
  }
}
