import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, conditional, ERROR_TYPES } from '@/lib/analytics';

function plausibleMock() {
  return vi.fn();
}

describe('error taxonomy (§6)', () => {
  it('lists exactly the eight standard error_type values from the spec', () => {
    expect(ERROR_TYPES).toEqual([
      'invalid_token',
      'expired_token',
      'already_claimed',
      'invalid_wallet_address',
      'transaction_failed',
      'network_unavailable',
      'wallet_connection_failed',
      'unknown',
    ]);
  });
});

describe('conditional error payload properties (§3.2)', () => {
  it('builds the error_type property', () => {
    expect(conditional.errorType('expired_token')).toEqual({ error_type: 'expired_token' });
    expect(conditional.errorType('invalid_token')).toEqual({ error_type: 'invalid_token' });
  });

  it('builds the error_code property', () => {
    expect(conditional.errorCode('TOKEN_EXPIRED')).toEqual({ error_code: 'TOKEN_EXPIRED' });
    expect(conditional.errorCode('unknown')).toEqual({ error_code: 'unknown' });
  });
});

describe('analytics.errorDisplayed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('emits Error Displayed with error_type and error_code', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'recipient',
      claimId: 'tok_123',
      errorType: 'expired_token',
      errorCode: 'TOKEN_EXPIRED',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[0]).toBe('Error Displayed');
    expect(call[1]).toEqual({
      props: {
        journey: 'recipient',
        claim_id: 'tok_123',
        error_type: 'expired_token',
        error_code: 'TOKEN_EXPIRED',
        source_screen: 'claim_landing',
      },
    });
  });

  it('defaults error_code to "unknown" and omits claim_id when not provided', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.errorDisplayed({
      journey: 'sender',
      errorType: 'invalid_token',
      sourceScreen: 'claim_landing',
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual({
      journey: 'sender',
      error_type: 'invalid_token',
      error_code: 'unknown',
      source_screen: 'claim_landing',
    });
    expect('claim_id' in call[1].props).toBe(false);
  });

  it('no-ops when the window object is unavailable', () => {
    const plausible = (window as unknown as { plausible: ReturnType<typeof plausibleMock> })
      .plausible;
    vi.stubGlobal('window', undefined);

    expect(() =>
      analytics.errorDisplayed({
        journey: 'recipient',
        errorType: 'expired_token',
        sourceScreen: 'claim_landing',
      }),
    ).not.toThrow();
    expect(plausible).not.toHaveBeenCalled();
  });
});