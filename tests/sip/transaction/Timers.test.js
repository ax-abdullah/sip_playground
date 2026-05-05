'use strict';

const TransactionTimers = require('../../../src/sip/transaction/Timers');

describe('TransactionTimers', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('timer fires after specified delay', () => {
    const timers = new TransactionTimers();
    const cb = jest.fn();

    timers.set('A', 500, cb);
    expect(cb).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('cleared timer does not fire', () => {
    const timers = new TransactionTimers();
    const cb = jest.fn();

    timers.set('A', 500, cb);
    timers.clear('A');

    jest.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
  });

  test('clearAll clears multiple timers', () => {
    const timers = new TransactionTimers();
    const cbA = jest.fn();
    const cbB = jest.fn();

    timers.set('A', 500, cbA);
    timers.set('B', 1000, cbB);
    expect(timers.activeCount).toBe(2);

    timers.clearAll();
    expect(timers.activeCount).toBe(0);

    jest.advanceTimersByTime(2000);
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).not.toHaveBeenCalled();
  });

  test('setting same timer name replaces previous', () => {
    const timers = new TransactionTimers();
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    timers.set('A', 500, cb1);
    timers.set('A', 500, cb2);

    jest.advanceTimersByTime(500);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  test('has returns correct state', () => {
    const timers = new TransactionTimers();
    expect(timers.has('A')).toBe(false);
    timers.set('A', 500, () => {});
    expect(timers.has('A')).toBe(true);
    timers.clear('A');
    expect(timers.has('A')).toBe(false);
  });
});
