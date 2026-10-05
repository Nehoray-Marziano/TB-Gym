export let currentMockUser = null;
export let currentMockRole = null;
export let currentMockAuthError = null;
export let currentMockProfileError = null;

export function configureMockAuth({ user = null, role = null, authError = null, profileError = null } = {}) {
    currentMockUser = user;
    currentMockRole = role;
    currentMockAuthError = authError;
    currentMockProfileError = profileError;
}

export function resetMockAuth() {
    currentMockUser = null;
    currentMockRole = null;
    currentMockAuthError = null;
    currentMockProfileError = null;
}

export async function createClient() {
    return {
        auth: {
            getUser: async () => ({
                data: { user: currentMockUser },
                error: currentMockAuthError,
            }),
        },
        from: (tableName) => ({
            select: (columns) => ({
                eq: (column, value) => ({
                    single: async () => ({
                        data: currentMockRole ? { role: currentMockRole } : null,
                        error: currentMockProfileError,
                    }),
                }),
            }),
        }),
    };
}
