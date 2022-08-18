import type {
  AnyObj,
  CharacteristicWithUUID,
  ServiceBehaviors,
} from '../types';
import type { Characteristic, Service } from '../helpers';
import { BehaviorTypes } from './types';
import { LogLevel } from 'homebridge';

export type BehaviorParams = {
  params?: AnyObj | undefined;
  state?: AnyObj | undefined;
};

const DependsOnKey = Symbol('DependsOn');

export abstract class Behavior<
  O extends BehaviorParams = {
    params: undefined;
    state: undefined;
  },
  P = O['params'] extends undefined ? { [key: string]: void } : O['params'],
  S = O['state'] extends undefined ? { [key: string]: void } : O['state'],
> {
  static UUID: string;
  abstract readonly UUID: string;
  abstract readonly name: string;

  public readonly accessory = this.service.accessory;
  public readonly platform = this.accessory.platform;
  public readonly log = (...args: Parameters<typeof this.service.log.log>) => {
    const [logLevel, ...rest] = args;

    this.service.log.log(logLevel, this.logName, ...rest);
  };

  public get logName() {
    return `[${this.accessory.params.name}] [${this.service.params.name}] [${
      this.name ?? this.constructor.name
    }]`;
  }

  abstract characteristics: Set<CharacteristicWithUUID>;

  protected readonly [DependsOnKey]: readonly BehaviorTypes[] =
    this[DependsOnKey];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #characteristicMap = new Map<CharacteristicWithUUID, Characteristic<any>>();

  protected get State() {
    this.service.state.behaviors[this.UUID] ??= {};
    return this.service.state.behaviors[this.UUID] as S & {
      params: P;
    };
  }

  constructor(
    public readonly service: Service,
    public readonly params: P | void | undefined = {} as P,
  ) {
    this.#checkDependencies();
  }

  protected registerCharacteristics(
    defaultValues: Map<CharacteristicWithUUID, any> = new Map(),
  ) {
    if (this.params) {
      this.State.params = this.params;
    }
    this.characteristics.forEach((characteristic) => {
      this.#characteristicMap.set(
        characteristic,
        this.service.useCharacteristic(
          characteristic,
          defaultValues.get(characteristic),
          true,
        ),
      );
    });
    this.service.behaviors.byUUID.set(
      this.UUID,
      this as unknown as ServiceBehaviors,
    );
  }

  protected get<C extends CharacteristicWithUUID>(characteristic: C) {
    const value = this.#characteristicMap.get(characteristic);
    if (!value) {
      throw new Error(
        `[Behavior] Characteristic ${characteristic} not found, did you forget to call this.registerCharacteristics() in the constructor?`,
      );
    }
    return value;
  }

  protected getAllCharacteristics() {
    return [...this.#characteristicMap.values()];
  }

  /**
   * This method may only be called if the behavior indicates that it depends on a given behavior type
   * with the `@DependsOn` decorator.
   *
   * @param type
   * @example
   * {@DependsOn([BehaviorTypes.STATE])
   *  class MyBehavior extends Behavior<...> {
   *  }}
   */
  protected getType<C extends BehaviorTypes>(
    type: C,
  ): NonNullable<Service['behaviors']['types'][C]> {
    const behavior = this.service.behaviors.types[type];
    this.log(
      LogLevel.INFO,
      'Depends? ',
      this[DependsOnKey].includes(type),
      type,
      this[DependsOnKey],
      this.UUID,
    );
    if (!this[DependsOnKey].includes(type)) {
      throw new Error(
        `${this.logName} may only use getType if it indicates a dependency with @DependsOn([${type}])`,
      );
    }

    return behavior as NonNullable<Service['behaviors']['types'][C]>;
  }

  #checkDependencies() {
    this[DependsOnKey].forEach((dependency) => {
      if (!this.service.behaviors.types[dependency]) {
        this.log(
          LogLevel.ERROR,
          `${this.name} depends on ${dependency} but it is not registered`,
        );
      }
    });
  }
}

/**
 * A behavior which depends on a specific type of behavior to also be included for it
 * to operate.
 *
 * This is important in cases when you may need to say set something on/off but are
 * not concerned with how that make occur. Such as when a Lock requires specific
 * behaviors to properly turn on/off where a switch does not - but this behavior
 * simply wants to use the universal methods given on any behavior of type `STATE`.
 *
 * @example
 *  {@DependsOn([BehaviorTypes.STATE])
 *  class StateTimeoutBehavior extends Behavior {}}
 */
export function DependsOn(types: readonly BehaviorTypes[]) {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    constructor.prototype[DependsOnKey] = types;
    constructor[DependsOnKey] = types;
    console.log(constructor, constructor.prototype);
    const value = class DependsOn extends constructor {
      [DependsOnKey] = types;
    };
    console.log('value: ', value);
    return value;
  };
}

export function UUID(uuid: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (constructor: Function & { UUID: string }) {
    constructor.prototype.UUID = uuid;
    constructor.UUID = uuid;
  };
}
