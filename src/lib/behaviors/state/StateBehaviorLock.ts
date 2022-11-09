import { LogLevel } from 'homebridge';
import { UUID } from '../../decorators/UUID';
import type { Service } from '../../helpers';
import type { CharacteristicWithUUID } from '../../types';
import { sleep } from '../../utils/promise';

import StateBehavior from './AbstractStateBehavior';

@UUID('8a1a52fd-41b6-447d-bde7-e3d1565b508e')
export class StateBehaviorLock extends StateBehavior<{
  state: { one: string };
  params: {
    config: {
      lockTimeout?: number;
    };
  };
}> {
  public readonly name = StateBehaviorLock.name;

  public readonly type = {
    LockCurrentState: this.platform.Characteristic.LockCurrentState,
    On: this.platform.Characteristic.LockTargetState,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.type),
  ]);

  private get $state() {
    return this.State;
  }

  public get state() {
    return this.$state as Readonly<typeof this.$state>;
  }

  constructor(...args: [Service, undefined]) {
    super(...args);
    super.registerCharacteristics(
      new Map([
        [this.type.LockCurrentState, this.type.LockCurrentState.SECURED],
        [this.type.On, this.type.On.SECURED],
      ]),
    );
    this.startSubscriptions();
  }

  private startSubscriptions() {
    const targetStateChara = this.get(this.type.On);
    const currentStateChara = this.get(this.type.LockCurrentState);

    {
      currentStateChara.onChange((newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} lock ${currentStateChara.name} ${this.service.params.name} changed to ${newValue}`,
        );
        currentStateChara.setValue(newValue);
      });
    }
    {
      targetStateChara.onChange(async (newValue) => {
        this.log(
          LogLevel.INFO,
          `${this.logName} lock ${targetStateChara.name} ${this.service.params.name} changed to ${newValue}`,
        );

        targetStateChara.setValue(newValue);

        await sleep(100);

        currentStateChara.setValue(
          newValue === this.type.On.SECURED
            ? this.type.LockCurrentState.SECURED
            : this.type.LockCurrentState.UNSECURED,
        );
      });
    }
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }

  public async stateSet(desiredState: boolean): Promise<void> {
    // set state
    const CurrentState = this.type.LockCurrentState;
    const TargetState = this.type.On;

    this.get(TargetState).setValue(
      desiredState ? TargetState.SECURED : TargetState.UNSECURED,
    );

    // for await (const startTime of forAwaitInterval(
    //   1000,
    //   Date.now()
    // )) {
    //   this.get(CurrentState).setValue(
    //     desiredState ? CurrentState.SECURED : CurrentState.UNSECURED,
    //   );
    // }

    await sleep(100);

    this.get(CurrentState).setValue(
      desiredState ? CurrentState.SECURED : CurrentState.UNSECURED,
    );
  }
}
