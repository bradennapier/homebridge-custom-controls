import { setTimeout, setImmediate, setInterval } from 'timers/promises';

export const sleep = setTimeout;

export const defer = setImmediate;

export const forAwaitInterval = setInterval;
