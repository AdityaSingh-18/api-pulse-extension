import { useEffect, useState } from "react";

export function useActiveTab(): number | null {
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function syncActiveTab() {
      try {
        const normalTabs = await chrome.tabs.query({
          active: true,
          windowType: "normal",
        });

        const candidate =
          normalTabs.find(
            (tab) =>
              tab.id !== undefined &&
              !tab.url?.startsWith("chrome-extension://"),
          ) ?? normalTabs[0];

        if (mounted && candidate?.id !== undefined) {
          setActiveTabId(candidate.id);
          return;
        }

        const [fallbackTab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });

        if (mounted) {
          setActiveTabId(fallbackTab?.id ?? null);
        }
      } catch {
        if (mounted) {
          setActiveTabId(null);
        }
      }
    }

    function handleTabActivated() {
      void syncActiveTab();
    }

    function handleWindowFocused(windowId: number) {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }

      void syncActiveTab();
    }

    function handleTabRemoved(tabId: number) {
      if (tabId === activeTabId) {
        void syncActiveTab();
      }
    }

    void syncActiveTab();

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.windows.onFocusChanged.addListener(handleWindowFocused);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);

    return () => {
      mounted = false;
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.windows.onFocusChanged.removeListener(handleWindowFocused);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
    };
  }, [activeTabId]);

  return activeTabId;
}