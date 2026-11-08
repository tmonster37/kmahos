export async function getPermissionsAsync() {
  return { status: 'granted' };
}

export async function requestPermissionsAsync() {
  return { status: 'granted' };
}

export async function getExpoPushTokenAsync() {
  return { data: 'ExponentPushToken[mock-token-12345]' };
}

export function addNotificationResponseReceivedListener(_listener: (response: any) => void) {
  return {
    remove: () => {},
  };
}

