// Utility for getting/setting user name in localStorage
export const USER_NAME_KEY = "proxima_user_name";
export const USER_CALL_CONTEXT_KEY = "proxima_user_call_context";

export function getUserName(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(USER_NAME_KEY) || "";
}

export function setUserName(name: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_NAME_KEY, name);
}

export function getUserCallContext(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(USER_CALL_CONTEXT_KEY) || "";
}

export function setUserCallContext(context: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_CALL_CONTEXT_KEY, context);
}
