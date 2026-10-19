import { useEffect, useState } from "react";

import {
  EmptyMonitoringState,
  MONITORING_STORAGE_KEY,
  normalizeMonitoringState,
  type MonitoringState,
} from "../lib/monitoring-types";

export function useMonitoringData() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(EmptyMonitoringState);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let storageChangedBeforeInitialRead = false;

    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "session" || !(MONITORING_STORAGE_KEY in changes)) {
        return;
      }

      storageChangedBeforeInitialRead = true;

      setMonitoringState(
        normalizeMonitoringState(changes[MONITORING_STORAGE_KEY].newValue),
      );

      setStorageError(false);
    }

    chrome.storage.onChanged.addListener(handleStorageChange);

    void chrome.storage.session
      .get(MONITORING_STORAGE_KEY)
      .then((stored) => {
        if (mounted && !storageChangedBeforeInitialRead) {
          setMonitoringState(
            normalizeMonitoringState(stored[MONITORING_STORAGE_KEY]),
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(true);
        }
      });

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    monitoringState,
    setMonitoringState,
    storageError,
    setStorageError,
  };
}