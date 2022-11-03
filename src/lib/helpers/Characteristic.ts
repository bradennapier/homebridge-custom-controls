import structuredClone from '@ungap/structured-clone';

import type {
  Characteristic as ServiceCharacteristic,
  CharacteristicValue,
  CharacteristicProps,
  CharacteristicChange,
} from 'homebridge';

import type { Writable, CharacteristicWithUUID, AnyObj } from '../types';
import { Service } from './Service';

type NullableValue = CharacteristicValue | null;

/**
 * Represents a wrapper around HAP characteristics with with support for easy configuration and update.
 */
export class Characteristic<V extends CharacteristicValue> {
  public readonly platform = this.service.platform;
  public readonly log = this.service.log;

  public readonly controller: ServiceCharacteristic;

  public readonly name = this.type.name;

  public get logName() {
    return `[${this.service.accessory.controller.displayName}] [${
      this.service.controller.displayName ?? this.service.params.name
    }] [${
      this.type.name ?? this.controller?.displayName ?? 'Unknown Characteristic'
    }]`;
  }

  /**
   * When getting the state publicly, we return a type which is readonly on all properties
   * so that the state can only be modified using our `#state` which is private to the instance.
   */
  public get state() {
    this.service.state.attributes[this.type.UUID] ??= {};
    return this.service.state.attributes[this.type.UUID] as Readonly<{
      name: string;
      set createdAt(value: Date | string);
      get createdAt(): string;
      set updatedAt(value: Date | string);
      get updatedAt(): string;
      updatedByUser: string | null;
      updatedBy: 'server' | 'user' | null;
      value: NullableValue;
      oldValue: NullableValue;
      initialValue: NullableValue;
      updateContext: AnyObj;
    }>;
  }

  protected get $state() {
    return this.state as Writable<typeof this.state>;
  }

  protected syncValues(context: unknown) {
    if (this.value !== this.state.value) {
      this.controller.updateValue(this.state.value, context);
    }
  }

  /**
   * Mutates state so that it will be saved to storage between Homebridge restarts. If
   *
   * @param value A partial shape of shape which is merged into the state object (shallow).
   * @param syncValues When sync is true (default), the value is immediately updated on the accessory.
   */
  protected setState(
    state: Partial<typeof this.state>,
    context: unknown = {},
    syncValues = true,
  ) {
    this.service.state.attributes[this.type.UUID] = {
      ...this.state,
      ...state,
    };

    if (syncValues) {
      this.syncValues(context);
    }
  }

  protected subscribers = {
    onChange: new Set<Parameters<typeof this.onChange>[0]>(),
    onGet: null as null | Parameters<typeof this.onGet>[0],
  };

  /**
   * Subscribes to the characteristics changes and returns a function that may be used to
   * cancel the subscription if needed.
   *
   * The callback is called with the new value and the `state` which includes various details
   * about the update & history.  This object is not mutable.  it is a clone of the state to
   * prevent accidental mutation.
   *
   * @param callback
   */
  public onChange(
    callback: (
      this: this,
      value: V | null,
      state: typeof this.state,
      change: CharacteristicChange,
    ) => unknown | Promise<unknown>,
  ) {
    this.subscribers.onChange.add(callback);
    return () => {
      this.subscribers.onChange.delete(callback);
    };
  }

  public onGet(
    callback: (
      this: this,
      context: unknown,
      state: typeof this.state,
    ) => V | null | Promise<V | null>,
  ) {
    if (this.subscribers.onGet) {
      this.log.warn(
        `${this.logName} onGet callback was already set and is being replaced by new callback.`,
      );
    }
    this.subscribers.onGet = callback;
    return () => {
      this.subscribers.onGet = null;
    };
  }

  /**
   * Initializes a new Characteristic instance.
   * @param service The parent service.
   * @param type The type of the characteristic.
   * @param value The initial value. If omitted, the cached value is used.
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly service: Service<any>,
    public readonly type: CharacteristicWithUUID,
    initialValue?: V,
  ) {
    this.controller =
      service.controller.getCharacteristic(type) ??
      service.controller.addCharacteristic(type);

    this.subscribeToChanges();

    this.controller.onGet(this.handleGetFromHomekit.bind(this));

    const state = this.state;

    let isNew = false;

    if (!state.createdAt) {
      isNew = true;
      this.setState(
        {
          name:
            this.type.name ??
            this.controller?.displayName ??
            'Unknown Characteristic',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'server',
          initialValue,
          oldValue: state.oldValue ?? null,
          updatedByUser: state.updatedByUser ?? null,
          value: state.value ?? initialValue ?? null,
          updateContext: state.updateContext ?? {
            value: undefined,
          },
        },
        { initialUpdate: true },
      );
    }

    if (isNew) {
      this.setState({
        value: initialValue ?? null,
      });
    } else {
      this.value = state.value as V | null;
    }
  }

  private async handleGetFromHomekit(context: unknown) {
    if (this.platform.config.logging === 'verbose') {
      this.log.info(`${this.logName} GET request from HomeKit`, {
        state: this.state,
        getContext: context,
      });
    }

    if (context) {
      this.log.info('[REMOVE ME] Get Context Seeen: ', context);
    }

    if (this.subscribers.onGet) {
      try {
        // override the get request by a behavior or similar
        const value = await this.subscribers.onGet.call(
          this,
          context,
          this.state,
        );
        if (value !== this.state.value) {
          // we do not need to trigger an update as it is being returned
          // to homekit
          this.setState({ value }, context, false);
        }
      } catch (error) {
        this.log.error(
          `${this.logName} Failed to Call handler ${String(
            context,
          )} for onGet due to Error: `,
          error,
        );
        throw error;
      }
    }

    return this.state.value ?? this.value ?? null;
  }

  private subscribeToChanges() {
    this.controller.on('change', async (change) => {
      const { oldValue, newValue } = change;

      if (newValue !== this.state.value) {
        this.setState({
          oldValue: oldValue ?? null,
          value: newValue ?? null,
          updatedAt: new Date().toString(),
          updatedBy: change.originator ? 'user' : 'server',
          updatedByUser: change.originator?.username ?? null,
          updateContext:
            change.context &&
            typeof change.context === 'object' &&
            !Array.isArray(change.context)
              ? change.context
              : { value: change.context },
        });

        this.log.info(
          `${this.logName} ${
            change.originator ? 'user' : 'server'
          } changed value: `,
          oldValue,
          ' -> ',
          newValue,
        );

        if (this.subscribers.onChange.size) {
          const clonedState = structuredClone(this.state);

          this.subscribers.onChange.forEach(async (callback) => {
            try {
              await callback.call(
                this,
                this.state.value as V | null,
                clonedState,
                change,
              );
            } catch (error) {
              this.log.error(
                `${this.logName} An onChange subscriber caused an error: `,
                error,
              );
            }
          });
        }
      }
    });
  }

  /**
   * Updates the properties of the characteristic.
   * @param properties The new properties of the characteristic.
   */
  public setProps(properties: Partial<CharacteristicProps>) {
    this.log.info(this.logName, this.setProps.name, { properties });
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
    this.setValue(value);
  }

  public setValue(value: V | null, context?: unknown) {
    console.info(this.logName, this.setValue.name, { value, context });
    this.controller.updateValue(
      value,
      Object.assign(
        { updatedBy: 'server' },
        !context
          ? {}
          : typeof context === 'object' && !Array.isArray(context)
          ? context
          : { value: context },
      ),
    );
  }
}
