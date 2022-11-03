import { LogLevel } from 'homebridge';

import { UUID } from '../decorators/UUID';
import { Characteristic, type Service } from '../helpers';

import type { CharacteristicWithUUID, UUIDCharacteristics } from '../types';
import { forAwaitInterval } from '../utils/promise';
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

  public readonly type = {
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
        [this.type.RemainingDuration, 0],
        [this.type.SetDuration, null],
      ]),
    );
    this.startSubscriptions().then(() => {
      this.log(LogLevel.DEBUG, `startSubscriptions done`);
    });
  }

  private timerId: NodeJS.Timeout | undefined = undefined;

  protected async startSubscriptions() {
    //
    const stateChara = this.getType(BehaviorTypes.STATE).get(
      (type) =>
        (type.On as UUIDCharacteristics<'On'>) ??
        (type.LockTargetState as UUIDCharacteristics<'LockTargetState'>),
    );

    const remainingDuration = this.get(this.type.RemainingDuration);
    const setDuration = this.get(this.type.SetDuration);
    const holdPosition: Characteristic<boolean> = this.get(
      this.type.HoldPosition,
    );
    // this has to match the remainingDuration max
    setDuration.setProps({
      minValue: 0,
      maxValue: 3600,
    });

    stateChara.onChange(async (newValue) => {
      this.log(
        LogLevel.INFO,
        `state changed to ${newValue} (${typeof newValue}) vs ${
          stateChara.controller.props.format
        }`,
      );

      switch (newValue) {
        case false:
        case true: {
          if (newValue && setDuration.value) {
            this.log(
              LogLevel.INFO,
              `Set Duration being used to set Remaining Duration ${setDuration.value}`,
            );

            remainingDuration.setValue(setDuration.value);

            for await (let toValue of forAwaitInterval(
              1000,
              setDuration.value as number,
            )) {
              if (holdPosition.value === true) {
                this.log(
                  LogLevel.INFO,
                  `RemainingDuration HOLD POSITION IS TRUE, RESETTING`,
                );
                remainingDuration.setValue(0);
                break;
              }
              const wasValue = toValue;
              toValue -= 1;
              this.log(
                LogLevel.INFO,
                `RemainingDuration ${wasValue} -> ${toValue}`,
              );
              remainingDuration.setValue(toValue);
            }
            remainingDuration.setValue(setDuration.value);
          } else {
            this.log(
              LogLevel.INFO,
              `Remaining Duration reset due to accessory being on or not having timeout`,
            );
            remainingDuration.setValue(0);
          }
          break;
        }
        case this.platform.hap.Characteristic.LockTargetState.SECURED:
        case this.platform.hap.Characteristic.LockTargetState.UNSECURED: {
          this.log(LogLevel.INFO, `Timeout Behavior for TargetLockState`);
          break;
        }
      }
    });

    // HOLD POSITION
    {
      const chara = holdPosition;

      holdPosition.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} *->* changed to`,
          newValue,
        );

        if (newValue === true) {
          this.log(
            LogLevel.INFO,
            `${this.logName} | ${chara.name} | ${this.service.params.name} *->* changed to`,
            newValue,
          );

          clearInterval(this.timerId);
          this.timerId = undefined;
        }
        // remainingDuration.setValue(newValue);
        holdPosition.setValue(!newValue);
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
