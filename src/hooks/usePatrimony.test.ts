import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { usePatrimony } from './usePatrimony';

const database = vi.hoisted(() => ({ from: vi.fn(), balance: 145500, fail: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: database.from } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('Patrimony refresh', () => {
 beforeEach(() => {
  database.balance = 145500;
  database.fail = false;
  database.from.mockReset();
  database.from.mockImplementation((table: string) => ({ select: () => ({ order: async () => ({
   data: table === 'receivables' ? [{ id: 'legacy', description: 'Cheques até mes 12', value: database.balance, paid_value: 0, cheque_legacy: true, type: 'Outro', status: 'A vencer' }] : [],
   error: database.fail ? { message: 'Unavailable' } : null,
  }) }) }));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
 });
 afterEach(() => { vi.restoreAllMocks(); });
 it('reads back updated legacy on return to the browser', async () => {
  const { result, unmount } = renderHook(() => usePatrimony());
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145500));
  database.balance = 145498.77;
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145498.77));
  database.balance = 145500;
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145500));
  unmount();
  database.from.mockClear();
  act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(database.from).not.toHaveBeenCalled();
 });
 it('does not refresh while hidden and preserves existing invalidation', async () => {
  const { result, unmount } = renderHook(() => usePatrimony());
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145500));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  database.from.mockClear();
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(database.from).not.toHaveBeenCalled();
  database.balance = 145498.77;
  act(() => queryClient.invalidateQueries({ queryKey: ['patrimony'] }));
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145498.77));
  unmount();
 });
 it('does not overwrite saved balances with empty data on a failed refresh', async () => {
  const { result, unmount } = renderHook(() => usePatrimony());
  await waitFor(() => expect(result.current.receivables[0]?.value).toBe(145500));
  database.fail = true;
  act(() => queryClient.invalidateQueries({ queryKey: ['patrimony'] }));
  await act(async () => { await Promise.resolve(); });
  expect(result.current.receivables[0]?.value).toBe(145500);
  unmount();
 });
});