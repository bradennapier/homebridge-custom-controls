import type { Characteristic } from '../helpers';
import { forAwaitInterval } from './promise';

export function useTimeout(
  callbacks: {
    /**
     * Called when the timer is finished running whether by cancellation or
     * by timing out.  Includes the reason for the completion of the timer.
     */
    onComplete?: (event: 'timeout' | 'cancel') => unknown;
    /**
     * When the timer successfully reaches 0 without being cancelled
     * in some form.
     *
     * WHEN : Countdown reaches 0 and no cancel has occurred
     */
    onTimeout?: (elapsedSeconds: number) => unknown;
    /**
     * Each second if we are continuing the countdown we call this if it exists
     * with the seconds remaining until the timeout will occur.
     */
    onTick?: (remainingSeconds: number) => unknown;
    /**
     * If the timer is cancelled, this is called.  Cancel events occur 👍
     *
     * WHEN : SetDuration Characteristic is set to 0 during a timeout
     * WHEN : Manually cancelled with the return value of useTimeout
     * WHEN : User sets RemainingDuration Characteristic to 0
     */
    onCancel?: () => unknown;
    /**
     * When the timer is reset to its original value.
     *
     * WHEN : User sets the HoldPosition to true during a timeout
     */
    onReset?: () => unknown;
  },
  {
    RemainingDuration,
    SetDuration,
    HoldPosition,
  }: {
    RemainingDuration: Characteristic<number>;
    SetDuration: Characteristic<number>;
    HoldPosition: Characteristic<boolean>;
  },
) {
  let isComplete = false;
  let isCancelled = false;
  let isRunning = false;
  let startTime: number | undefined;

  let runProm: Promise<void> | undefined;

  if (SetDuration.value <= 0) {
    console.log('No Set Duration Value, skipping timeout behavior');
    return;
  }

  function handleCancellation(runCallbacks = true) {
    if (isComplete || !isRunning) {
      return false;
    }
    isComplete = true;
    isRunning = false;
    isCancelled = true;
    startTime = undefined;
    runProm = undefined;

    setTimeout(() => {
      HoldPosition.setValue(false);
      RemainingDuration.setValue(0);
      if (runCallbacks) {
        callbacks.onCancel?.();
        callbacks.onComplete?.('cancel');
      }
    });
    return true;
  }

  function handleTimeout(elapsedSeconds: number) {
    if (isComplete || !isRunning) {
      return false;
    }

    // we want to reset all the state values to their initial state
    handleCancellation(false);
    setTimeout(() => {
      callbacks.onTimeout?.(elapsedSeconds);
      callbacks.onComplete?.('timeout');
    });

    return true;
  }

  function handleReset() {
    if (isComplete || !isRunning) {
      return false;
    }

    startTime = Date.now();
    setTimeout(() => {
      HoldPosition.setValue(false);
      callbacks.onReset?.();
    });
    return true;
  }

  async function run() {
    const startingDurationSeconds = SetDuration.value;
    const initialStartTime = Date.now();
    startTime = initialStartTime;

    HoldPosition.setValue(false);
    RemainingDuration.setValue(startingDurationSeconds);
    isRunning = true;

    for await (const _ of forAwaitInterval(1000)) {
      const setDurationValue = SetDuration.value;

      if (
        !isRunning ||
        isCancelled ||
        setDurationValue <= 0 ||
        RemainingDuration.value <= 0
      ) {
        // if user sets duration to 0 during timeout running , cancel timeout
        // without triggering onTimeout
        handleCancellation();
        break;
      }

      if (HoldPosition.value === true) {
        // reset the timer and set HoldPosition to false
        handleReset();
      }

      const now = Date.now();
      const elapsedSeconds = Math.round((now - startTime) / 1000);
      const remainingSeconds = Math.max(0, setDurationValue - elapsedSeconds);

      if (remainingSeconds <= 0) {
        handleTimeout(Math.round((now - initialStartTime) / 1000));
        break;
      }

      RemainingDuration.setValue(remainingSeconds);

      if (callbacks.onTick) {
        setTimeout(() => {
          callbacks.onTick?.(remainingSeconds);
        });
      }
    }

    setTimeout(() => {
      isRunning = false;
      isComplete = true;
    }, 100);
  }

  const controller = {
    get isCancelled() {
      return isCancelled;
    },
    get isRunning() {
      return isRunning;
    },
    get isComplete() {
      return isComplete;
    },
    get promise() {
      return Promise.resolve(runProm);
    },
    cancel: (runCallbacks = true) => {
      return handleCancellation(runCallbacks);
    },
    start: () => {
      if (isComplete) {
        return false;
      }
      if (isRunning && runProm) {
        return true;
      }

      const prom = runProm ?? run();
      runProm = prom;
      return true;
    },
    reset: () => {
      if (!isComplete && isRunning) {
        handleReset();
        return true;
      }
      return false;
    },
    forceTimeout: () => {
      if (!isComplete && isRunning) {
        handleTimeout(0);
        return true;
      }
      return false;
    },
  } as const;

  controller.start();

  return controller;
}
