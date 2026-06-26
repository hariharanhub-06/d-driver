// Tokens live in the OS keychain/keystore via expo-secure-store.
// Non-secret prefs (selected child, language) use AsyncStorage.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';
const USER = 'user';

export async function saveSession(access: string, refresh: string, user: unknown) {
    await Promise.all([
        SecureStore.setItemAsync(ACCESS, access),
        SecureStore.setItemAsync(REFRESH, refresh),
        AsyncStorage.setItem(USER, JSON.stringify(user)),
    ]);
}

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH);
export const setAccessToken = (t: string) => SecureStore.setItemAsync(ACCESS, t);

export async function getStoredUser<T = any>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearSession() {
    await Promise.all([
        SecureStore.deleteItemAsync(ACCESS),
        SecureStore.deleteItemAsync(REFRESH),
        AsyncStorage.removeItem(USER),
    ]);
}

// Generic non-secret prefs.
export const getPref = (k: string) => AsyncStorage.getItem(k);
export const setPref = (k: string, v: string) => AsyncStorage.setItem(k, v);
