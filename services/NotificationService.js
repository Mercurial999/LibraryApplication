import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const LAST_SEEN_KEY = 'notifications_last_seen_at';

export async function markNotificationsSeenNow() {
  const now = new Date().toISOString();
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY, now);
  } catch {}
  return now;
}

export async function getLastSeenAt() {
  try {
    const v = await AsyncStorage.getItem(LAST_SEEN_KEY);
    return v || null;
  } catch {
    return null;
  }
}

export async function getUnreadCount(limit = 20) {
  try {
    const lastSeen = await getLastSeenAt();
    const res = await ApiService.getRecentActivity(null, limit);
    const items = res?.data?.activities || res?.data || res?.activities || [];
    if (!lastSeen) return items.length;
    const last = new Date(lastSeen).getTime();
    let count = 0;
    for (const a of items) {
      const t = new Date(a.createdAt || a.time || a.date || 0).getTime();
      if (t && t > last) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}
