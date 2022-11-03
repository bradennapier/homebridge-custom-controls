import type {
  Characteristic as ServiceCharacteristic,
  Service as AccessoryService,
  WithUUID,
} from 'homebridge';

import type { Service } from './helpers';

type UUIDCharacteristicsMapped = {
  [K in keyof typeof ServiceCharacteristic]: typeof ServiceCharacteristic[K] extends WithUUID<
    new () => ServiceCharacteristic
  >
    ? [K, typeof ServiceCharacteristic[K]]
    : never;
}[keyof typeof ServiceCharacteristic];

export type UUIDCharacteristicMap = {
  [K in UUIDCharacteristicsMapped as K[0]]: K[1];
};

export type UUIDCharacteristics<
  K extends keyof UUIDCharacteristicMap | Array<keyof UUIDCharacteristicMap>,
> = K extends keyof UUIDCharacteristicMap
  ? UUIDCharacteristicMap[K]
  : K extends Array<infer U>
  ? U extends keyof UUIDCharacteristicMap
    ? {
        [K in U]: UUIDCharacteristicMap[K];
      }
    : never
  : never;

export type CharacteristicWithUUID = {
  [K in keyof typeof ServiceCharacteristic]: typeof ServiceCharacteristic[K] extends WithUUID<
    new () => ServiceCharacteristic
  >
    ? typeof ServiceCharacteristic[K]
    : never;
}[keyof typeof ServiceCharacteristic];

// export type CharacteristicWithoutUUID = {
//   [K in keyof typeof ServiceCharacteristic]: typeof ServiceCharacteristic[K] extends WithUUID<
//     new () => ServiceCharacteristic
//   >
//     ?never
//     : typeof ServiceCharacteristic[K];
// }[keyof typeof ServiceCharacteristic];

export type ServiceWithUUID = {
  [K in keyof typeof AccessoryService]: typeof AccessoryService[K] extends WithUUID<
    new () => AccessoryService
  >
    ? typeof AccessoryService[K]
    : never;
}[keyof typeof AccessoryService];

// export type ServiceWithOutUUID = {
//   [K in keyof typeof AccessoryService]: typeof AccessoryService[K] extends WithUUID<
//     new () => AccessoryService
//   >
//     ? never
//     : typeof AccessoryService[K];
// }[keyof typeof AccessoryService];

export const SWITCH_SENSORS = [
  'anyChanges',
  'anyChangesToOn',
  'anyChangesToOff',
  'anyOn',
  'anyOff',
  'allOn',
  'allOff',
  'majorityOn',
  'majorityOff',
] as const;

export const SPECIAL_SENSOR_TYPES = ['systemStartup'] as const;

export type SwitchSensorTypes = typeof SWITCH_SENSORS[number];

export type SpecialSensorTypes = typeof SPECIAL_SENSOR_TYPES[number];

export type SwitchConfig = {
  name: string;
  uniqueID: string;
  switchType:
    | 'stateful'
    | 'stateful-timeout'
    | 'interval-timeout'
    | 'stateless';
  systemStartBehavior: 'on' | 'off' | 'toggle-to-on' | 'toggle-to-off' | 'none';
  timeoutSeconds?: number;
  reverseDefaultState?: boolean;
};

export type SwitchGroup = {
  name: string;
  uniqueID: string;
  displayAs: 'switches' | 'power' | 'locks';
  includeSensors?: SwitchSensorTypes[];
  switches: SwitchConfig[];
};

export interface Config {
  name?: string;
  logging: 'basic' | 'verbose' | 'none';
  includeSpecialSensors?: SpecialSensorTypes[];
  switchGroups?: SwitchGroup[];
  platform: 'CustomControls';
}

export type AccessoryInformation = {
  /**
   * Gets or sets the manufacturer.
   */
  manufacturer?: string;

  /**
   * Gets or sets the manufacturer.
   */
  model?: string;

  /**
   * Gets or sets the manufacturer.
   */
  serialNumber?: string;

  /**
   * Gets or sets the manufacturer.
   */
  firmwareRevision?: string;

  /**
   * Gets or sets the manufacturer.
   */
  hardwareRevision?: string;
};

export type AnyObj = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type Writable<O> = {
  -readonly [K in keyof O]: O[K];
};

type ServiceBehaviorsImport = typeof import('./behaviors');

export type ServiceBehaviors =
  ServiceBehaviorsImport[keyof ServiceBehaviorsImport];

type ServiceBehaviorsMapped = {
  [K in keyof ServiceBehaviorsImport]: ConstructorParameters<
    ServiceBehaviorsImport[K]
  > extends [Service, infer P]
    ? P extends undefined
      ? ServiceBehaviorsImport[K] | [ServiceBehaviorsImport[K], P]
      : [ServiceBehaviorsImport[K], P]
    : ServiceBehaviorsImport[K];
};

export type ServiceBehaviorsParam =
  ServiceBehaviorsMapped[keyof ServiceBehaviorsMapped];
