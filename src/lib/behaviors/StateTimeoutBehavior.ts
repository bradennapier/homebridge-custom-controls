import { LogLevel } from 'homebridge';

import { UUID } from '../decorators/UUID';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID, UUIDCharacteristics } from '../types';
import { forAwaitInterval } from '../utils/promise';
import { DependsOn, Behavior } from './AbstractBehavior';
import { BehaviorTypes } from './types';

export type StateTimeoutBehaviorParams = Readonly<{
  /**
   * The default is to start the timeout when
   * the state becomes true (switched on), but
   * this can be inverted using this param.
   */
  timeoutWhenStateBecomes?: boolean;
}>;

/**
 * A behavior that implements general timeout behavior with the ability to set the Timeout
 * duration, disable it, or reset it.
 *
 * When the timer expires the attached State handler will be changed.
 *
 * @remarks
 *
 * This is purely for controlling the value of a State behavior which
 * extends AbstractStateBehavior.
 *
 * @DependsOn BehaviorTypes.STATE
 */
@UUID('ffdfc6eb-7b79-4078-b0fb-6f93f59fe095')
@DependsOn([BehaviorTypes.STATE])
export class StateTimeoutBehavior extends Behavior<{
  state: { one: string };
  params: Required<StateTimeoutBehaviorParams>;
  // params: StateTimeoutBehaviorParams;
}> {
  public readonly name = StateTimeoutBehavior.name;

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

  constructor(...args: [Service, undefined | StateTimeoutBehaviorParams]) {
    const [service, params] = args;
    super(service, {
      ...(params ?? {}),
      timeoutWhenStateBecomes: params?.timeoutWhenStateBecomes ?? true,
    });

    super.registerCharacteristics(
      new Map<CharacteristicWithUUID, unknown>([
        [this.type.HoldPosition, false],
        [this.type.RemainingDuration, 0],
        [this.type.SetDuration, 0],
      ]),
    );

    this.startSubscriptions().then(() => {
      this.log(LogLevel.DEBUG, `startSubscriptions done`);
    });
  }

  private timerId: NodeJS.Timeout | undefined = undefined;

  protected async startSubscriptions() {
    const { timeoutWhenStateBecomes } = this.params;
    // Get the state characteristic from the dependend upon STATE behavior.
    // This could be locks or switches or whatever conforms to the behavior / protocol.
    const stateBehavior = this.getType(BehaviorTypes.STATE);

    const stateChara = stateBehavior.get(
      (type) =>
        (type.On as UUIDCharacteristics<'On'>) ??
        (type.LockTargetState as UUIDCharacteristics<'LockTargetState'>),
    );

    const remainingDuration = this.get(this.type.RemainingDuration);
    const setDuration = this.get(this.type.SetDuration);
    const holdPosition = this.get(this.type.HoldPosition);
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
        // renders to 1 (true) or 0 (false)
        case this.platform.hap.Characteristic.LockTargetState.SECURED:
        case this.platform.hap.Characteristic.LockTargetState.UNSECURED:
        case false:
        case true: {
          if (newValue === timeoutWhenStateBecomes && setDuration.value) {
            this.log(
              LogLevel.INFO,
              `Set Duration being used to set Remaining Duration ${setDuration.value}`,
            );

            remainingDuration.setValue(setDuration.value);

            for await (const startTime of forAwaitInterval(1000, Date.now())) {
              const setDurationValue = setDuration.value;

              if (remainingDuration.value === 0) {
                await stateBehavior.stateSet(!timeoutWhenStateBecomes);
                break;
              }

              if (stateChara.value === false) {
                this.log(LogLevel.INFO, `RemainingDuration OFF , cancel timer`);
                break;
              }

              if (setDurationValue === 0) {
                this.log(
                  LogLevel.INFO,
                  `RemainingDuration SET DURATION SET TO 0 , cancel timer`,
                );
                await stateBehavior.stateSet(!timeoutWhenStateBecomes);
                break;
              }

              if (holdPosition.value === true) {
                this.log(
                  LogLevel.INFO,
                  `RemainingDuration HOLD POSITION IS TRUE, RESETTING TIMER`,
                );

                setTimeout(async () => {
                  await stateBehavior.stateSet(!timeoutWhenStateBecomes);
                  await stateBehavior.stateSet(timeoutWhenStateBecomes);
                });

                break;
              }

              const now = Date.now();
              const elapsed = Math.round((now - startTime) / 1000);
              const remaining = Math.max(0, setDurationValue - elapsed);

              if (remaining <= 0) {
                this.log(LogLevel.INFO, `RemainingDuration TIMED OUT`);
                await stateBehavior.stateSet(!timeoutWhenStateBecomes);
                break;
              }

              this.log(
                LogLevel.INFO,
                `RemainingDuration ${setDurationValue} duration ${elapsed}s elapsed -> ${remaining}s remaining`,
              );
              remainingDuration.setValue(remaining);
            }
          } else {
            this.log(
              LogLevel.INFO,
              `Remaining Duration reset due to accessory being on or not having timeout`,
            );
            remainingDuration.setValue(0);
          }
          break;
        }
      }

      if (holdPosition.value === true) {
        holdPosition.setValue(false);
      }
    });

    // HOLD POSITION
    {
      const chara = holdPosition;

      holdPosition.onChange((newValue, state) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name}  *->* changed from ${state.oldValue} to`,
          newValue,
        );

        // // remainingDuration.setValue(newValue);
        holdPosition.setValue(newValue);

        if (newValue === true) {
          setTimeout(() => {
            if (holdPosition.value === true) {
              holdPosition.setValue(false);
            }
          }, 1000);
        }
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

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed to ${newValue}`,
        );
        chara.setValue(newValue);
      });
    }
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }
}
