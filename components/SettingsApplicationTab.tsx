import React, { useEffect, useRef, useState } from "react";
import { ArrowUpCircle, Check, Download, FileUp, Loader2, Newspaper, RefreshCcw, Trash2, Wrench } from "lucide-react";
import AppLogo from "./AppLogo";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useApplicationBackend } from "../application/state/useApplicationBackend";
import type { UpdateState, UseUpdateCheckResult } from "../application/state/useUpdateCheck";
import { useI18n } from "../application/i18n/I18nProvider";
import { useVaultState } from "../application/state/useVaultState";
import { importVaultHostsFromText } from "../domain/vaultImport";
import { SettingsTabContent } from "./settings/settings-ui";
import { toast } from "./ui/toast";

type AppInfo = {
  name: string;
  version: string;
  platform?: string;
};

const REPO_URL = "https://github.com/binaricat/ALinLink";

const ActionRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left",
      "hover:bg-muted/50 transition-colors"
    )}
  >
    <div className="shrink-0 text-muted-foreground">{icon}</div>
    <div className="min-w-0">
      <div className="text-sm font-medium leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
    </div>
  </button>
);

interface SettingsApplicationTabProps {
  updateState: UpdateState;
  checkNow: UseUpdateCheckResult['checkNow'];
  openReleasePage: UseUpdateCheckResult['openReleasePage'];
  installUpdate: UseUpdateCheckResult['installUpdate'];
  startDownload: UseUpdateCheckResult['startDownload'];
  isUpdateDemoMode: boolean;
}

export default function SettingsApplicationTab({ updateState, checkNow, openReleasePage, installUpdate, startDownload, isUpdateDemoMode }: SettingsApplicationTabProps) {
  const { t } = useI18n();
  const { openExternal, getApplicationInfo, clearAppCache } = useApplicationBackend();
  const { exportData, importData, hosts } = useVaultState();
  const [appInfo, setAppInfo] = useState<AppInfo>({ name: "ALinLink", version: "" });
  const [lastCheckResult, setLastCheckResult] = useState<'none' | 'available' | 'upToDate'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const info = await getApplicationInfo();
        if (!cancelled && info?.name && typeof info?.version === "string") {
          setAppInfo(info);
        }
      } catch {
        // Ignore: running in browser/dev without Electron bridge
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [getApplicationInfo]);

  const handleOpenExternal = async (url: string) => {
    try {
      await openExternal(url);
    } catch (err) {
      console.warn("[SettingsApplicationTab] openExternal failed:", err);
      toast.error(
        t("settings.application.openExternal.failedBody"),
        t("settings.application.openExternal.failedTitle"),
      );
    }
  };

  const handleCheckForUpdates = async () => {
    // In demo mode, allow checking even for dev builds
    if (!isUpdateDemoMode && (!appInfo.version || appInfo.version === '0.0.0')) {
      // Dev build - just open releases page
      openReleasePage();
      return;
    }

    setLastCheckResult('none');

    const result = await checkNow();

    if (result?.hasUpdate && result.latestRelease) {
      setLastCheckResult('available');
      toast.info(
        t('update.available.message', { version: result.latestRelease.version }),
        t('update.available.title')
      );
      // Don't auto-open the release page here — checkNow() already triggers
      // electron-updater on supported platforms, and the Settings > System tab
      // shows a "Manual Download" link on unsupported platforms.
    } else if (result) {
      setLastCheckResult('upToDate');
      toast.success(
        t('update.upToDate.message', { version: appInfo.version }),
        t('update.upToDate.title')
      );
    }

    // Reset the result after 3 seconds
    setTimeout(() => setLastCheckResult('none'), 3000);
  };

  const releasesUrl = `${REPO_URL}/releases`;

  const handleExportVault = () => {
    try {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ALinLink-vault-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.application.exportSuccess"), t("settings.application.exportTitle"));
    } catch (err) {
      console.error("导出失败:", err);
      toast.error(t("settings.application.exportFailed"), t("settings.application.exportTitle"));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importVaultHostsFromText("ssh_config", text, hosts);
      if (result.hosts.length > 0) {
        await importData({ hosts: [...hosts, ...result.hosts] });
        toast.success(
          t("settings.application.importSuccess", { count: result.hosts.length }),
          t("settings.application.importTitle")
        );
      } else {
        toast.warning(t("settings.application.importNoHosts"), t("settings.application.importTitle"));
      }
    } catch (err) {
      console.error("导入失败:", err);
      toast.error(t("settings.application.importFailed"), t("settings.application.importTitle"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearCache = () => {
    try {
      const count = clearAppCache();
      if (count > 0) {
        toast.success(t("settings.application.clearCacheSuccess"), t("settings.application.clearCacheTitle"));
      } else {
        toast.info(t("settings.application.clearCacheSuccess"), t("settings.application.clearCacheTitle"));
      }
    } catch (err) {
      console.error("清理缓存失败:", err);
      toast.error(t("settings.application.clearCacheFailed"), t("settings.application.clearCacheTitle"));
    }
  };

  return (
    <SettingsTabContent value="application">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
        <div className="lg:w-[320px] shrink-0">
          <div className="flex items-center gap-4">
            <AppLogo className="w-16 h-16" />
            <div>
              {/* Match the Vault sidebar wordmark so the ALinLink brand
                  reads consistently across surfaces — same italic heavy
                  cut, just scaled up for the Settings hero area and
                  using the branded mixed-case "ALinLink" instead of
                  the lowercase electron app name. */}
              <div className="text-3xl font-black italic tracking-tight leading-none text-foreground">
                ALinLink
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {appInfo.version ? appInfo.version : " "}
                </span>
                {/* Update badge - reflects auto-download state */}
                {updateState.latestRelease && (updateState.hasUpdate || updateState.autoDownloadStatus === 'downloading' || updateState.autoDownloadStatus === 'ready') && (
                  <button
                    onClick={() => updateState.autoDownloadStatus === 'ready' ? installUpdate() : updateState.autoDownloadStatus === 'downloading' ? undefined : startDownload()}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      updateState.autoDownloadStatus === 'ready'
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                        : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800",
                      "transition-colors cursor-pointer"
                    )}
                  >
                    <ArrowUpCircle size={12} />
                    v{updateState.latestRelease.version}{' '}
                    {updateState.autoDownloadStatus === 'ready'
                      ? t('update.restartNow')
                      : updateState.autoDownloadStatus === 'downloading'
                        ? `${updateState.downloadPercent}%`
                        : t('update.downloadNow')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => void handleCheckForUpdates()}
              disabled={updateState.isChecking || updateState.manualCheckStatus === 'checking' || updateState.autoDownloadStatus === 'downloading' || updateState.autoDownloadStatus === 'ready'}
            >
              {updateState.isChecking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : lastCheckResult === 'upToDate' ? (
                <Check size={16} />
              ) : (
                <RefreshCcw size={16} />
              )}
              {updateState.isChecking
                ? t("update.checking")
                : t("settings.application.checkUpdates")
              }
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <div className="space-y-2">
            <ActionRow
              icon={<Newspaper size={18} />}
              title={t("settings.application.whatsNew")}
              subtitle={t("settings.application.whatsNew.subtitle")}
              onClick={() => void handleOpenExternal(releasesUrl)}
            />
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={16} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("settings.application.toolbox")}
              </h3>
            </div>
            <div className="space-y-2">
              <ActionRow
                icon={<Download size={18} />}
                title={t("settings.application.exportVault")}
                subtitle={t("settings.application.exportVaultSubtitle")}
                onClick={handleExportVault}
              />
              <ActionRow
                icon={<FileUp size={18} />}
                title={t("settings.application.importSshConfig")}
                subtitle={t("settings.application.importSshConfigSubtitle")}
                onClick={handleImportClick}
              />
              <ActionRow
                icon={<Trash2 size={18} />}
                title={t("settings.application.clearCache")}
                subtitle={t("settings.application.clearCacheSubtitle")}
                onClick={handleClearCache}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".config,.*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </SettingsTabContent>
  );
}
