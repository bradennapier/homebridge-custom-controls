import { LogLevel } from 'homebridge';
import { UUID } from '../decorators/UUID';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID } from '../types';
import { DependsOn, Behavior } from './AbstractBehavior';
import { BehaviorTypes } from './types';

// type StateTimeoutBehaviorParams = undefined;

/**
 *
 * @DependsOn BehaviorTypes.STATE
 */
@UUID('ffdfc6eb-7b79-4078-b0fb-6f93f59fe095')
@DependsOn([BehaviorTypes.STATE])
export class StateTimeoutBehavior extends Behavior<{
  state: { one: string };
  // params: StateTimeoutBehaviorParams;
}> {
  public readonly name = this.constructor.name;

  protected readonly type = {
    HoldPosition: this.platform.Characteristic.HoldPosition,
    RemainingDuration: this.platform.Characteristic.RemainingDuration,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.type),
  ]);

  protected get $state() {
    return this.State;
  }

  public get state() {
    const state = this.$state;
    return state as Readonly<typeof state>;
  }

  constructor(...args: [Service, undefined]) {
    super(...args);
    super.registerCharacteristics(
      new Map<CharacteristicWithUUID, unknown>([
        [this.type.HoldPosition, false],
        [this.type.RemainingDuration, 0],
      ]),
    );
    this.startSubscriptions();
  }

  protected startSubscriptions() {
    //
    this.getType(BehaviorTypes.STATE).stateSet(true);

    this.get(this.type.HoldPosition).onChange((newValue) => {
      this.log(
        LogLevel.INFO,
        `holdPosition ${this.service.params.name} changed to ${newValue}`,
      );
      this.updateTimeout();
    });

    this.get(this.type.HoldPosition).onChange((newValue) => {
      this.log(
        LogLevel.INFO,
        `HOLD POSITION ${this.service.params.name} changed to ${newValue}`,
      );
    });
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }
}
