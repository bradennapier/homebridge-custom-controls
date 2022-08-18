import { BehaviorParams, Behavior } from '../AbstractBehavior';
import { BehaviorTypes } from '../types';

export default abstract class StateBehavior<
  O extends BehaviorParams = BehaviorParams,
> extends Behavior<O> {
  // abstract setState(): void;
  protected override registerCharacteristics() {
    super.registerCharacteristics();
    this.service.behaviors.types[BehaviorTypes.STATE] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this as any;
  }

  abstract stateSet(desiredState: boolean): void;
}
