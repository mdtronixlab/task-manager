// Enforces the single API response shape defined in architecture.md §14 /
// rules.md §28, so the React frontend never has to branch on inconsistent
// response structures between endpoints.

export function success(data = {}, message = 'Success') {
  return { success: true, data, message };
}

export function error(code, message) {
  return {
    success: false,
    error: {
      code: code || 'UNKNOWN_ERROR',
      message: message || 'Something went wrong. Please try again.',
    },
  };
}
