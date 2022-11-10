import { LogLevel } from 'homebridge';

import { UUID } from '../decorators/UUID';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID } from '../types';
import { useTimeout } from '../utils/useTimeout';
// import { forAwaitInterval } from '../utils/promise';
import { Behavior } from './AbstractBehavior';
import { BehaviorTypes } from './types';

// type StateTimeoutBehaviorParams = undefined;

/**
 * A behavior that implements general timeout behavior with the ability to set the Timeout
 * duration, disable it, or reset it.
 *
 * @DependsOn BehaviorTypes.STATE
 */
@UUID('5efc7d99-a6e1-4b93-861b-0c0720702daa')
export class TimeoutBehavior extends Behavior<{
  state: { one: string };
  // params: StateTimeoutBehaviorParams;
}> {
  public readonly name = TimeoutBehavior.name;

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
        [this.type.SetDuration, 0],
      ]),
    );

    this.startSubscriptions()
      .then(() => {
        this.log(LogLevel.DEBUG, `startSubscriptions done`);
      })
      .catch((err) => {
        this.log(LogLevel.ERROR, `startSubscriptions error`, err);
      });

    this.service.behaviors.types[BehaviorTypes.TIMEOUT] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this as any;
  }

  protected async startSubscriptions() {
    const { SetDuration, RemainingDuration, HoldPosition } =
      this.getCharacteristicMap(this.type);

    SetDuration.setProps({
      minValue: 0,
      maxValue: 3600,
    });

    // REMAINING DURATION
    {
      const chara = RemainingDuration;

      chara.onChange((newValue, { oldValue }) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed | ${oldValue} --> ${newValue}`,
        );
      });
    }

    // SET DURATION
    {
      const chara = SetDuration;

      chara.onChange((newValue, { oldValue }) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed | ${oldValue} --> ${newValue}`,
        );
      });
    }

    // HOLD POSITION
    {
      const chara = HoldPosition;

      chara.onChange((newValue, { oldValue }) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed | ${oldValue} --> ${newValue}`,
        );
      });
    }
  }

  public timeoutController: ReturnType<typeof useTimeout> | undefined;

  public startTimeout(callbacks?: Parameters<typeof useTimeout>[0]) {
    this.log(LogLevel.INFO, 'Starting Timeout, cancelling one if present');

    this.cancelTimeout();

    const characteristics = this.getCharacteristicMap(this.type);

    this.timeoutController = useTimeout(callbacks ?? {}, characteristics);

    if (!this.timeoutController) {
      this.log(
        LogLevel.WARN,
        'Timeout not defined for this service, timeout callbacks will be run immediately',
      );

      setTimeout(() => {
        callbacks?.onComplete?.('timeout');
        callbacks?.onTimeout?.(0);
      });

      return;
    }

    return this.timeoutController.promise;
  }

  public cancelTimeout() {
    if (this.timeoutController && this.timeoutController.isRunning) {
      // dont run callbacks as we are running from outside and expect to have handled things already
      this.timeoutController.cancel(false);
      this.timeoutController = undefined;
    }
  }
}
