import { LogLevel } from 'homebridge';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID } from '../types';
import { DependsOn, Behavior, UUID } from './AbstractBehavior';
import { BehaviorTypes } from './types';

// type StateTimeoutBehaviorParams = undefined;

/**
 *
 * @DependsOn BehaviorTypes.STATE
 */
@DependsOn([BehaviorTypes.STATE])
@UUID('ffdfc6eb-7b79-4078-b0fb-6f93f59fe095')
export class StateTimeoutBehavior extends Behavior<{
  state: { one: string };
  // params: StateTimeoutBehaviorParams;
}> {
  public readonly UUID: string = this.UUID;
  public readonly name = this.constructor.name;

  readonly #type = {
    HoldPosition: this.platform.Characteristic.HoldPosition,
    RemainingDuration: this.platform.Characteristic.RemainingDuration,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.#type),
  ]);

  get #state() {
    return this.State;
  }

  get state() {
    const state = this.#state;
    return state as Readonly<typeof state>;
  }

  constructor(...args: [Service, undefined]) {
    super(...args);
    super.registerCharacteristics(
      new Map([
        [this.#type.HoldPosition, 0],
        [this.#type.RemainingDuration, 0],
      ]),
    );
    this.#startSubscriptions();
  }

  #startSubscriptions() {
    //
    this.getType(BehaviorTypes.STATE).stateSet(true);
  }

  #updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }
}
