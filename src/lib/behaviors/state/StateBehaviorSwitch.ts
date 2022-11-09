import structuredClone from '@ungap/structured-clone';

import { LogLevel } from 'homebridge';
import { UUID } from '../../decorators/UUID';
import { type Service } from '../../helpers';
import type { CharacteristicWithUUID } from '../../types';
import StateBehavior from './AbstractStateBehavior';

@UUID('fc85738f-4007-4531-a6d7-934dc2dc31d0')
export class StateBehaviorSwitch extends StateBehavior<{
  state: { one: string };
  // params: undefined;
}> {
  public readonly name = StateBehaviorSwitch.name;

  public readonly type = {
    On: this.platform.Characteristic.On,
  } as const;

  public readonly characteristics = new Set<CharacteristicWithUUID>([
    ...Object.values(this.type),
  ]);

  protected get $state() {
    return this.State;
  }

  public get state() {
    const state = structuredClone(this.$state);
    return Object.freeze(state);
  }

  constructor(...args: [Service, undefined]) {
    super(...args);
    this.registerCharacteristics(new Map([[this.type.On, false]]));
    this.startSubscriptions();
  }

  private startSubscriptions() {
    const onChar = this.get(this.type.On);
    onChar.onChange((newValue) => {
      this.log(
        LogLevel.INFO,
        `switch ${
          this.service.params.name
        } changed to ${newValue} (${typeof newValue})`,
      );
      if (typeof newValue === 'boolean') {
        this.stateSet(newValue);
      }
    });
  }

  private updateTimeout() {
    this.log(LogLevel.INFO, `updateTimeout called`);
  }

  public async stateSet(desiredState: boolean): Promise<void> {
    // set state
    this.log(LogLevel.INFO, `stateSet called to set to: ${desiredState}`);
    this.get(this.type.On).setValue(desiredState);
  }
}
