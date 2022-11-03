import { LogLevel } from 'homebridge';
import { UUID } from '../../decorators/UUID';
import type { Service } from '../../helpers';
import type { CharacteristicWithUUID } from '../../types';

import StateBehavior from './AbstractStateBehavior';

@UUID('8a1a52fd-41b6-447d-bde7-e3d1565b508e')
export class StateBehaviorLock extends StateBehavior<{
  state: { one: string };
  // params: undefined;
}> {
  public readonly name = this.constructor.name;

  private readonly type = {
    LockCurrentState: this.platform.Characteristic.LockCurrentState,
    LockTargetState: this.platform.Characteristic.LockTargetState,
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
        [this.type.LockTargetState, this.type.LockTargetState.SECURED],
      ]),
    );
    this.startSubscriptions();
  }

  private startSubscriptions() {
    // no
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }

  public stateSet(desiredState: boolean): void {
    // set state
    const CurrentState = this.type.LockCurrentState;
    const TargetState = this.type.LockTargetState;

    this.get(TargetState).setValue(
      desiredState ? TargetState.SECURED : TargetState.UNSECURED,
    );
    this.get(CurrentState).setValue(
      desiredState ? CurrentState.SECURED : CurrentState.UNSECURED,
    );
  }
}
