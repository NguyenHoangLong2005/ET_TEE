export const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

export const getGuestCartToken = () => {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('guest_cart_token');
    if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem('guest_cart_token', token);
    }
    return token;
}

export const getAuthHeaders = (guestTokenRequired = false) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    const authToken = getAuthToken();
    const guestToken = getGuestCartToken();

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (guestTokenRequired && guestToken) {
        headers['X-Guest-Cart-Token'] = guestToken;
    } else if (!authToken && guestToken) {
        // If not logged in, provide guest token to endpoints that might need it
        headers['X-Guest-Cart-Token'] = guestToken;
    }
    
    return headers;
}
