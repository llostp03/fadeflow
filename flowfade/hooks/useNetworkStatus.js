import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/**
 * Tracks connectivity. `isOffline === true` when the device has no connection.
 */
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;

    NetInfo.fetch().then((state) => {
      if (!active) return;
      setIsOffline(!state?.isConnected);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state?.isConnected);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { isOffline };
}
