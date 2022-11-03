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
    SetDuration: this.platform.Characteristic.SetDuration,
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
        [this.type.RemainingDuration, 1000],
        [this.type.SetDuration, 0],
      ]),
    );
    this.startSubscriptions().then(() => {
      this.log(LogLevel.DEBUG, `startSubscriptions done`);
    });
  }

  protected async startSubscriptions() {
    //
    this.getType(BehaviorTypes.STATE).stateSet(true);

    const remainingDuration = this.get(this.type.RemainingDuration);

    // HOLD POSITION
    {
      const chara = this.get(this.type.HoldPosition);

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} HOLD ${this.service.params.name} changed to ${newValue}`,
        );

        remainingDuration.setValue(newValue);
        chara.setValue(false);
      });
    }

    // REMAINING DURATION
    {
      const chara = remainingDuration;

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} REMAINING ${this.service.params.name} changed to ${newValue}`,
        );
        chara.setValue(newValue);
      });
    }
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }
}
