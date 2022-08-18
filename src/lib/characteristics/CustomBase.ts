/**
 * customCharacteristic allows to observe Air Pressure level in Homebridge Web page
 * this is not visible in Homebridge application though because Apple does not support AirPressure Characteristic
 */
import { Formats, Perms, Units } from 'homebridge';
import { CUSTOM_INFO_UUID } from '../characteristics';
import type { Platform } from '../helpers/Platform';
import type { CharacteristicWithUUID } from '../types';

export default function CustomCharacteristic(platform: Platform) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Characteristic: any = platform.hap.Characteristic;

  class CustomCharacteristicClass extends Characteristic {
    static UUID: string = CUSTOM_INFO_UUID;

    constructor() {
      super('Custom Info', CUSTOM_INFO_UUID, {
        format: Formats.UINT16,
        unit: Units.SECONDS,
        minValue: 0,
        maxValue: 50000,
        minStep: 1,
        perms: [
          Perms.PAIRED_READ,
          Perms.NOTIFY,
          Perms.PAIRED_WRITE,
          Perms.EVENTS,
        ],
      });
      this.value = this.getDefaultValue();
    }
  }

  return CustomCharacteristicClass as CharacteristicWithUUID;
}