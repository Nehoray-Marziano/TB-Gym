// Preserve the established input contract and support Supabase's configured
// six-to-eight-digit email codes, including leading zeroes.
export function isValidEmailOtp(value: string): boolean {
    return /^\d{6,8}$/.test(value.trim());
}
