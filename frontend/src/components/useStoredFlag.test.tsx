import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoredFlag } from './useStoredFlag';

const KEY = 'test-flag';
const ON = 'yes';

afterEach(() => vi.restoreAllMocks());

describe('useStoredFlag', () => {
  it('starts false with an empty store', () => {
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    expect(result.current[0]).toBe(false);
  });

  it('starts true when the stored value is onValue', () => {
    localStorage.setItem(KEY, ON);
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    expect(result.current[0]).toBe(true);
  });

  it('starts false when the stored value is something else', () => {
    localStorage.setItem(KEY, 'no');
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    expect(result.current[0]).toBe(false);
  });

  it('stores onValue when set to true', () => {
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(ON);
  });

  it('removes the key when set to false', () => {
    localStorage.setItem(KEY, ON);
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('starts false, without throwing, when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    expect(result.current[0]).toBe(false);
  });

  it('still switches for this visit when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useStoredFlag(KEY, ON));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
});
