import { platformName, name, version, devDependencies } from '../package.json';

/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = platformName;

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = name;

export const PACKAGE_VERSION = version;

export const HOMEBRIDGE_VERSION = devDependencies.homebridge;
