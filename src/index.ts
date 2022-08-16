import { Homebridge } from 'homebridge-framework';
import { Platform } from './lib/platform';

/**
 * This method registers the platform with Homebridge
 */
export = Homebridge.register(new Platform());
