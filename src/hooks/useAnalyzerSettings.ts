import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  DEFAULT_ANALYZER_SETTINGS,
  normalizeAnalyzerSettings,
  SETTINGS_STORAGE_KEY,
  type AnalyzerSettings,
} from "../lib/analyzer-settings";

export function useAnalyzerSettings(
  setStorageError: Dispatch<SetStateAction<boolean>>,
) {
  const [settings, setSettings] = useState<AnalyzerSettings>(DEFAULT_ANALYZER_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<AnalyzerSettings>(DEFAULT_ANALYZER_SETTINGS);
  const [ignoredStatusCodesInput, setIgnoredStatusCodesInput] = useState("401");
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let settingsChangedBeforeInitialRead = false;

    function applySettings(value: unknown) {
      const next = normalizeAnalyzerSettings(value);

      setSettings(next);
      setDraftSettings(next);
      setIgnoredStatusCodesInput(next.ignoredStatusCodes.join(", "));
    }

    function handleSettingsChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) {
      if (areaName !== "local" || !(SETTINGS_STORAGE_KEY in changes)) {
        return;
      }

      settingsChangedBeforeInitialRead = true;
      applySettings(changes[SETTINGS_STORAGE_KEY].newValue);
    }

    chrome.storage.onChanged.addListener(handleSettingsChange);

    void chrome.storage.local
      .get(SETTINGS_STORAGE_KEY)
      .then((stored) => {
        if (mounted && !settingsChangedBeforeInitialRead) {
          applySettings(stored[SETTINGS_STORAGE_KEY]);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(true);
        }
      });

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleSettingsChange);
    };
  }, [setStorageError]);

  return {
    settings,
    setSettings,
    draftSettings,
    setDraftSettings,
    ignoredStatusCodesInput,
    setIgnoredStatusCodesInput,
    settingsMessage,
    setSettingsMessage,
  };
}