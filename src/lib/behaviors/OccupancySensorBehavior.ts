import { LogLevel } from 'homebridge';

import { UUID } from '../decorators/UUID';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID, UUIDCharacteristics } from '../types';
// import { forAwaitInterval } from '../utils/promise';
import { DependsOn, Behavior } from './AbstractBehavior';
import { BehaviorTypes } from './types';

// type StateTimeoutBehaviorParams = undefined;

/**
 * A behavior that implements general timeout behavior with the ability to set the Timeout
 * duration, disable it, or reset it.
 *
 * @DependsOn BehaviorTypes.STATE
 */
@UUID('ffdfc6eb-7b79-4078-b0fb-6f93f59fe095')
@DependsOn([BehaviorTypes.TIMEOUT])
export class OccupancySensorBehavior extends Behavior<{
  state: { one: string };
  // params: StateTimeoutBehaviorParams;
}> {
  public readonly name = OccupancySensorBehavior.name;

  public readonly type = {
    OccupancyDetected: this.platform.Characteristic.OccupancyDetected,
    MotionDetected: this.platform.Characteristic.MotionDetected,
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
        [this.type.OccupancyDetected, false],
        [this.type.MotionDetected, false],
      ]),
    );
    this.startSubscriptions()
      .then(() => {
        this.log(LogLevel.DEBUG, `startSubscriptions done`);
      })
      .catch((err) => {
        this.log(LogLevel.ERROR, `startSubscriptions error`, err);
      });
  }

  protected async startSubscriptions() {
    // Get the state characteristic from the dependend upon STATE behavior.
    // This could be locks or switches or whatever conforms to the behavior / protocol.
    const timeoutBehavior = this.getType(BehaviorTypes.TIMEOUT);
    const setDuration = timeoutBehavior.get(
      (type) => type.SetDuration as UUIDCharacteristics<'SetDuration'>,
    );
    const remainingDuration = timeoutBehavior.get(
      (type) =>
        type.RemainingDuration as UUIDCharacteristics<'RemainingDuration'>,
    );

    const occupancyDetected = this.get(this.type.OccupancyDetected);
    const motionDetected = this.get(this.type.MotionDetected);

    // OCCUPANCY DETECTED
    {
      const chara = occupancyDetected;

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} changed to ${newValue}`,
        );
        chara.setValue(newValue);
      });
    }

    // MOTION DETECTED
    {
      const chara = motionDetected;

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} changed to ${newValue}`,
        );
        chara.setValue(newValue);
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
      });
    }

    // SET DURATION
    {
      const chara = setDuration;

      chara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} ${chara.name} ${this.service.params.name} changed to ${newValue}`,
        );
      });
    }
  }
}
