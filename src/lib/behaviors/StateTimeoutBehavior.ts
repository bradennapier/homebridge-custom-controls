import { LogLevel } from 'homebridge';
import { UUID } from '../decorators/UUID';
import { Characteristic, type Service } from '../helpers';

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
        [this.type.SetDuration, null],
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
    const setDuration = this.get(this.type.SetDuration);
    // this has to match the remainingDuration max
    setDuration.setProps({
      minValue: 0,
      maxValue: 3600,
    });

    const holdPosition: Characteristic<boolean> = this.get(
      this.type.HoldPosition,
    );
    // HOLD POSITION
    {
      const chara = holdPosition;

      holdPosition.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} *->* changed to`,
          newValue,
        );

        // remainingDuration.setValue(newValue);
        holdPosition.setValue(false);
      });
    }

    {
      const chara = setDuration;

      setDuration.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed to ${newValue}`,
        );

        setDuration.setValue(newValue);
      });
    }

    // REMAINING DURATION
    {
      const chara = remainingDuration;

      remainingDuration.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed to ${newValue}`,
        );
        remainingDuration.setValue(newValue);
      });
    }
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }
}
