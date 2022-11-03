/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

type UUID_TYPE = string;

export const UUID_KEY = Symbol.for('hap/UUID');

export function UUID(uuid: UUID_TYPE) {
  return Reflect.metadata(UUID_KEY, uuid);
}
// eslint-disable-next-line @typescript-eslint/ban-types
export function getUUID<C extends Function>(target: C) {
  const result: unknown = Reflect.getMetadata(UUID_KEY, target);
  if (!result || typeof result !== 'string') {
    throw new Error(
      `[@UUID] | getUUID | No UUID found for target: ${
        target.name
      } | received: ${typeof result}} | try returning a @UUID decorator on the Service/Accessory`,
    );
  }
  return result;
}
