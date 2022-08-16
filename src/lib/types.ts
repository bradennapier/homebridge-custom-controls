import type {
  PlatformConfig,
  Characteristic as ServiceCharacteristic,
  Service as AccessoryService,
  WithUUID,
} from 'homebridge';

export type CharacteristicWithUUID = {
  [K in keyof typeof ServiceCharacteristic]: typeof ServiceCharacteristic[K] extends WithUUID<
    new () => ServiceCharacteristic
  >
    ? typeof ServiceCharacteristic[K]
    : never;
}[keyof typeof ServiceCharacteristic];

export type ServiceWithUUID = {
  [K in keyof typeof AccessoryService]: typeof AccessoryService[K] extends WithUUID<
    new () => AccessoryService
  >
    ? typeof AccessoryService[K]
    : never;
}[keyof typeof AccessoryService];

const SWITCH_SENSORS = [
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

export type SwitchSensorTypes = typeof SWITCH_SENSORS[number];

export type SpecialSensorTypes = 'systemStartup';

export type SwitchConfig = {
  name: string;
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
  displayAs: 'switches' | 'power' | 'locks';
  includeSensors?: SwitchSensorTypes[];
  switches: SwitchConfig[];
};

export interface Config {
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
