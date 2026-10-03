import 'crypto-js/lib-typedarrays';
type UpdateAsset = {
  key: string;
  hash: string;
  url: string;
  fileExtension: string;
};
type Manifest = {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: UpdateAsset;
  assets: UpdateAsset[];
  extra?: {
    expoClient?: {
      updates?: {
        force?: boolean;
      };
    };
  };
};
type Update = {
  updateId: string;
  runtimeVersion: string;
  createdAt: Date;
  manifest: Manifest;
  assetRequestHeaders?: Record<string, Record<string, string>>;
};
declare const _default: {
  useUpdates: import('zustand').UseBoundStore<
    import('zustand').StoreApi<{
      currentlyRunning: {
        updateId: string | null;
        createdAt: Date | null;
        hash: string;
        runtimeVersion: string;
        assets: Record<string, string>;
      };
      isChecking: boolean;
      checkError: Error | undefined;
      availableUpdate: Update | undefined;
      downloadedUpdate: Update | undefined;
      isDownloading: boolean;
      downloadProgress: number | undefined;
      downloadError: Error | undefined;
      isUpdatePending: boolean;
      isRestarting: boolean;
    }>
  >;
  checkForUpdateAsync: () => Promise<{
    isAvailable: boolean;
    manifest: Manifest | undefined;
  }>;
  fetchUpdateAsync: () => Promise<
    | {
        isNew: boolean;
        manifest: undefined;
      }
    | {
        isNew: boolean;
        manifest: Manifest;
      }
  >;
  reloadAsync: () => Promise<void>;
  updateId: string | null;
  createdAt: Date | null;
  hash: string;
  runtimeVersion: string;
  assets: Record<string, string>;
};
export default _default;
