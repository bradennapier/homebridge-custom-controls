import { LogLevel } from 'homebridge';

import { UUID } from '../decorators/UUID';
import { type Service } from '../helpers';

import type { CharacteristicWithUUID } from '../types';
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
@UUID('13eebe39-b4dd-482e-85ee-f6e41d6c827c')
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

    const { OccupancyDetected, MotionDetected } = this.getCharacteristicMap(
      this.type,
    );

    // OCCUPANCY DETECTED
    {
      const chara = OccupancyDetected;

      chara.onChange((newValue, { oldValue }) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} changed | ${oldValue} --> ${newValue}`,
        );
        chara.setValue(newValue);
      });
    }

    // MOTION DETECTED
    {
      const chara = MotionDetected;

      chara.onChange((newValue, { oldValue }) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} | ${chara.name} | ${this.service.params.name} changed | ${oldValue} --> ${newValue}`,
        );

        chara.setValue(newValue);

        if (newValue) {
          timeoutBehavior.cancelTimeout();
          // If motion is detected, set the occupancy to true.
          OccupancyDetected.setValue(true);
        } else {
          timeoutBehavior.startTimeout({
            onComplete: () => {
              this.log(
                LogLevel.INFO,
                'Occupancy Timeout Complete, setting to unoccupied',
              );
              OccupancyDetected.setValue(false);
            },
          });
        }
      });
    }
  }
}
