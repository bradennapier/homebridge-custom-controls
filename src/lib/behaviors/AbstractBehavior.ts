import type {
  AnyObj,
  CharacteristicWithUUID,
  ServiceBehaviors,
} from '../types';
import { Characteristic, Service } from '../helpers';
import { BehaviorTypes } from './types';
import { LogLevel } from 'homebridge';

import { getUUID } from '../decorators/UUID';

export type BehaviorParams = {
  params?: AnyObj | undefined;
  state?: AnyObj | undefined;
};

const DependsOnKey = Symbol.for('hap/Behavior.DependsOn');

export abstract class Behavior<
  O extends Readonly<BehaviorParams> = {
    readonly params: undefined;
    readonly state: undefined;
  },
  // C extends Behavior<O, any> = Behavior<O, any>,
  P = O['params'] extends undefined ? { [key: string]: void } : O['params'],
  S = O['state'] extends undefined ? { [key: string]: void } : O['state'],
> {
  static get UUID(): string {
    const uuid = getUUID(this.constructor);
    console.log('uuid static result: ', this.constructor, this, uuid);

    return uuid;
  }

  readonly UUID: string = getUUID(this.constructor);

  public readonly params: P;

  abstract readonly name: string;

  abstract readonly type: Readonly<{
    readonly [key: string]: CharacteristicWithUUID;
  }>;

  constructor(
    public readonly service: Service,
    params: P | void | undefined = {} as P,
  ) {
    this.service = service;
    this.params = params as P;
    this.checkDependencies();
  }

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

  abstract readonly characteristics: Set<CharacteristicWithUUID>;

  protected readonly [DependsOnKey]: readonly BehaviorTypes[] =
    this[DependsOnKey] ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected characteristicMap = new Map<
    CharacteristicWithUUID,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Characteristic<any>
  >();

  protected get State() {
    this.service.state.behaviors[this.UUID] ??= {};
    return this.service.state.behaviors[this.UUID] as S & {
      name: string;
      params: P;
    };
  }

  protected registerCharacteristics(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues = new Map<CharacteristicWithUUID, any>(),
  ) {
    if (this.params) {
      this.State.params = this.params;
    }
    if (typeof this.characteristics === 'undefined') {
      this.log(
        LogLevel.WARN,
        `[${this.logName}] No characteristics defined, this behavior won't do anything`,
      );
      return;
    }

    this.State.name = this.name ?? this.constructor.name;
    this.characteristics.forEach((characteristic) => {
      this.characteristicMap.set(
        characteristic,
        this.service.useCharacteristic(
          characteristic,
          defaultValues.get(characteristic),
          true,
        ),
      );
    });
    this.log(
      LogLevel.INFO,
      `[${this.logName}] Registered ${this.characteristics.size} characteristics`,
    );
    this.service.behaviors.byUUID.set(
      this.UUID,
      this as unknown as ServiceBehaviors,
    );
  }

  public get(
    $characteristic:
      | CharacteristicWithUUID
      | ((types: typeof this.type) => CharacteristicWithUUID),
  ) {
    console.log(
      typeof $characteristic,
      $characteristic,
      'UUID' in $characteristic,
    );
    const characteristic =
      'UUID' in $characteristic
        ? ($characteristic as CharacteristicWithUUID)
        : (
            $characteristic as (
              types: typeof this.type,
            ) => CharacteristicWithUUID
          )(this.type);

    const value = this.characteristicMap.get(characteristic);
    if (!value) {
      throw new Error(
        `[${this.logName}] [Behavior] Characteristic ${characteristic} not found, did you forget to call this.registerCharacteristics() in the constructor?`,
      );
    }

    return value;
  }

  protected getAllCharacteristics() {
    return [...this.characteristicMap.values()];
  }

  public getCharacteristicMap<T extends typeof this.type>(
    of: T,
  ): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof T]: Characteristic<any>;
  } {
    const result = Object.entries(of).reduce(
      (obj, [name, instance]) => {
        const chara = this.get(instance);
        if (!chara) {
          throw new Error(
            `[${this.logName}] | getCharacteristicMap | Characteristic ${instance} not found, did you forget to call this.registerCharacteristics() in the constructor?`,
          );
        }
        obj[name as keyof T] = chara;

        return obj;
      },
      {} as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [K in keyof T]: Characteristic<any>;
      },
    );
    return result;
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
  public getType<C extends BehaviorTypes>(
    type: C,
  ): NonNullable<Service['behaviors']['types'][C]> {
    const behavior = this.service.behaviors.types[type];
    this.log(
      LogLevel.INFO,
      'Depends? ',
      this.logName,
      this[DependsOnKey].includes(type),
      type,
      this[DependsOnKey].length,
      this.UUID,
    );
    if (!this[DependsOnKey].includes(type)) {
      throw new Error(
        `[${this.name}] ${this.logName} may only use getType if it indicates a dependency with @DependsOn([${type}])`,
      );
    }

    return behavior as NonNullable<Service['behaviors']['types'][typeof type]>;
  }

  private checkDependencies() {
    this[DependsOnKey].forEach((dependency) => {
      if (!this.service.behaviors.types[dependency]) {
        this.log(
          LogLevel.ERROR,
          `${this.logName} depends on ${dependency} but it is not registered`,
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
 * not concerned with how to that make occur. Such as when a Lock requires specific
 * behaviors to properly turn on/off where a switch does not - but this behavior
 * simply wants to use the universal methods given on any behavior of type `STATE`.
 *
 * @example
 *  {@DependsOn([BehaviorTypes.STATE])
 *  class StateTimeoutBehavior extends Behavior {}}
 */
export function DependsOn<B extends readonly BehaviorTypes[]>(types: B) {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    constructor.prototype[DependsOnKey] = types;
    constructor[DependsOnKey] = types;
    // console.log(constructor, constructor.prototype);
    const value = class extends constructor {
      name = constructor.name;
      [DependsOnKey] = types;
    };
    // console.log('value: ', value);
    return value;
  };
}
