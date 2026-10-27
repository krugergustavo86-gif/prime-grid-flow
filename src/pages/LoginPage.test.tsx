import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({ recover: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { resetPasswordForEmail: mocks.recover } } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe('Password recovery privacy', () => {
 beforeEach(() => vi.clearAllMocks());
 it.each([null, { message: 'User not found' }])('does not reveal whether the account exists (%j)', async error => {
  mocks.recover.mockResolvedValue({ data: {}, error });
  const { container } = render(<LoginPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  const email = container.querySelector('input[type="email"]');
  if (!email) throw new Error('Email input missing');
  fireEvent.change(email, { target: { value: 'recovery-check@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
  await waitFor(() => expect(mocks.recover).toHaveBeenCalledWith('recovery-check@example.com', { redirectTo: `${window.location.origin}/reset-password` }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
  expect(mocks.error).not.toHaveBeenCalled();
  expect(mocks.success.mock.calls[0]?.[0]).not.toContain('User not found');
 });
});