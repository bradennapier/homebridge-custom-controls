import type {
  Characteristic as ServiceCharacteristic,
  CharacteristicValue,
  CharacteristicProps,
} from 'homebridge';
import { CharacteristicWithUUID } from '../types';
import { Service } from './Service';

/**
 * Represents a wrapper around HAP characteristics with with support for easy configuration and update.
 */
export class Characteristic<V extends CharacteristicValue> {
  public readonly platform = this.service.platform;
  public readonly log = this.service.log;

  public readonly controller: ServiceCharacteristic;

  public onChange?: (value: V) => unknown | Promise<unknown>;

  /**
   * Initializes a new Characteristic instance.
   * @param service The parent service.
   * @param type The type of the characteristic.
   * @param value The initial value. If omitted, the cached value is used.
   */
  constructor(
    public readonly service: Service,
    public readonly type: CharacteristicWithUUID,
    initialValue?: V,
  ) {
    this.controller =
      service.controller.getCharacteristic(type) ??
      service.controller.addCharacteristic(type);

    // Sets the value of the characteristic
    if (initialValue !== undefined) {
      this.controller.updateValue(initialValue);
    }

    // Subscribes for changes of the value
    this.controller.on('set', async (value, callback) => {
      // Checks if a handler has been set
      if (typeof this.onChange !== 'function') {
        return callback();
      }

      // Calls the handler function
      await this.onChange(value as V);

      // Calls the callback
      callback();
    });
  }

  /**
   * Updates the properties of the characteristic.
   * @param properties The new properties of the characteristic.
   */
  public setProps(properties: CharacteristicProps) {
    this.controller.setProps(properties);
  }

  /**
   * Gets the value of the characteristic.
   */
  public get value() {
    return this.controller.value as V | null;
  }

  /**
   * Sets the value of the characteristic.
   */
  public set value(value: V | null) {
    this.controller.updateValue(value);
  }
}
