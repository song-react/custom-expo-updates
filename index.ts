import CryptoJS from 'crypto-js/core';
import Base64url from 'crypto-js/enc-base64url';
import 'crypto-js/lib-typedarrays';
import SHA256 from 'crypto-js/sha256';
import { requireNativeModule } from 'expo';
import { applicationId } from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import { PixelRatio, type ImageResolvedAssetSource } from 'react-native';
import { create } from 'zustand';

type UpdateAsset = {
  key: string;
  hash: string;
  url: string;
  fileExtension: string;
};

type UpdateConfig = {
  version?: string;
  ios?: { bundleIdentifier?: string };
  updates?: { force?: boolean };
};

type Manifest = {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: UpdateAsset;
  assets: UpdateAsset[];
  extra?: { expoClient?: UpdateConfig; expoConfig?: UpdateConfig };
};

type Update = {
  updateId: string;
  runtimeVersion: string;
  createdAt: Date;
  manifest: Manifest;
  assetRequestHeaders?: Record<string, Record<string, string>>;
};

const _module = requireNativeModule<{
  getCurrent: () => {
    id: string | null;
    createdAt: string | null;
    hash: string;
    runtimeVersion: string;
    assets: Record<string, string>;
  };
  replace: (
    _manifestJSON: string,
    _stagingDirectoryURI: string
  ) => Promise<void>;
}>('Updates');

const {
  id: _updateId,
  createdAt: _createdAt,
  ..._current
} = _module.getCurrent();
const _manifestUrl = 'http://localhost:3000/api/manifest';
let _checked = false;
let _downloaded: { update: Update; directory: Directory } | undefined;

if (!__DEV__ && Object.keys(_current.assets).length) {
  const _resolve = require('react-native/Libraries/Image/resolveAssetSource')
    .default as {
    pickScale: (_scales: number[], _deviceScale: number) => number;
    setCustomSourceTransformer: (
      _transformer: (_resolver: {
        asset: { scales: number[]; hash: string; fileHashes?: string[] };
        fromSource: (_uri: string) => ImageResolvedAssetSource;
        defaultAsset: () => ImageResolvedAssetSource;
      }) => ImageResolvedAssetSource
    ) => void;
  };
  _resolve.setCustomSourceTransformer(_resolver => {
    const _asset = _resolver.asset;
    const _scale = _resolve.pickScale(_asset.scales, PixelRatio.get());
    const _hash =
      _asset.fileHashes?.[_asset.scales.indexOf(_scale)] ??
      _asset.fileHashes?.[0] ??
      _asset.hash;
    const _uri = _current.assets[_hash];
    return _uri ? _resolver.fromSource(_uri) : _resolver.defaultAsset();
  });
}

const _currentlyRunning = {
  ..._current,
  updateId: _updateId,
  createdAt: _createdAt ? new Date(_createdAt) : null,
};

const _useUpdates = create(() => ({
  currentlyRunning: _currentlyRunning,
  isChecking: false,
  checkError: undefined as Error | undefined,
  availableUpdate: undefined as Update | undefined,
  downloadedUpdate: undefined as Update | undefined,
  isDownloading: false,
  downloadProgress: undefined as number | undefined,
  downloadError: undefined as Error | undefined,
  isUpdatePending: false,
  isRestarting: false,
}));
let _fetching: ReturnType<typeof _fetchUpdateAsync> | undefined;
let _checking:
  Promise<{ isAvailable: boolean; manifest: Manifest | undefined }> | undefined;

const _check = async (): Promise<Update | undefined> => {
  const _response = await fetch(_manifestUrl, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: 'application/expo+json, application/json, multipart/mixed',
      'expo-protocol-version': '1',
      'expo-platform': 'ios',
      'expo-runtime-version': _current.runtimeVersion,
    },
  });
  if (!_response.ok) throw new Error(`HTTP ${_response.status}`);
  if (_response.status === 204) return;

  const _contentType = _response.headers.get('content-type') ?? '';
  const _text = await _response.text();
  let _manifest: Manifest;
  let _assetRequestHeaders: Update['assetRequestHeaders'];
  if (/^multipart\/mixed\b/i.test(_contentType)) {
    const _boundary = _contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    const _delimiter = _boundary?.[1] ?? _boundary?.[2];
    if (!_delimiter || !_text.includes(`--${_delimiter}--`)) {
      throw new Error('Invalid multipart response');
    }
    const _parts: Record<string, string> = {};
    for (const _part of _text.split(`--${_delimiter}`).slice(1, -1)) {
      const [_headers, ..._body] = _part.split(/\r?\n\r?\n/);
      const _name = _headers.match(/\bname="?([^";\r\n]+)"?/i)?.[1];
      if (_name) {
        if (_name in _parts) throw new Error('Duplicate response part');
        _parts[_name] = _body.join('\n\n').trim();
      }
    }
    if (_parts.directive) {
      if (JSON.parse(_parts.directive).type === 'noUpdateAvailable') return;
      throw new Error('Unsupported directive');
    }
    _manifest = JSON.parse(_parts.manifest);
    _assetRequestHeaders = _parts.extensions
      ? JSON.parse(_parts.extensions).assetRequestHeaders
      : undefined;
  } else {
    _manifest = JSON.parse(_text);
  }
  const _createdAt = new Date(_manifest.createdAt);
  if (
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(_manifest.id) ||
    !Array.isArray(_manifest.assets) ||
    !Number.isFinite(_createdAt.getTime())
  ) {
    throw new Error('Invalid manifest');
  }
  const _config = _manifest.extra?.expoClient ?? _manifest.extra?.expoConfig;
  if (
    !applicationId ||
    !_current.runtimeVersion ||
    _manifest.runtimeVersion !== _current.runtimeVersion ||
    _config?.version !== _current.runtimeVersion ||
    _config?.ios?.bundleIdentifier !== applicationId ||
    !(_createdAt.getTime() > (_currentlyRunning.createdAt?.getTime() ?? NaN))
  ) {
    return;
  }
  const _assets = [_manifest.launchAsset, ..._manifest.assets];
  if (
    !_assets.every(
      _asset =>
        _asset &&
        typeof _asset.key === 'string' &&
        /^[A-Za-z0-9_-]+$/.test(_asset.key) &&
        typeof _asset.fileExtension === 'string' &&
        /^\.[A-Za-z0-9]+$/.test(_asset.fileExtension) &&
        typeof _asset.hash === 'string' &&
        /^[A-Za-z0-9_-]{43}$/.test(_asset.hash) &&
        typeof _asset.url === 'string' &&
        /^https?:$/.test(new URL(_asset.url, _manifestUrl).protocol)
    ) ||
    new Set(_assets.map(_asset => _asset.key + _asset.fileExtension)).size !==
      _assets.length
  ) {
    throw new Error('Invalid asset metadata');
  }
  return {
    updateId: _manifest.id,
    runtimeVersion: _manifest.runtimeVersion,
    createdAt: _createdAt,
    manifest: _manifest,
    assetRequestHeaders: _assetRequestHeaders,
  };
};

const _checkForUpdateAsync = () => {
  if (_checking) return _checking;
  _checked = false;
  _useUpdates.setState({
    isChecking: true,
    checkError: undefined,
    availableUpdate: undefined,
  });
  return (_checking = _check()
    .then(_update => {
      _checked = true;
      _useUpdates.setState({ availableUpdate: _update });
      return { isAvailable: !!_update, manifest: _update?.manifest };
    })
    .catch((_error: Error) => {
      _useUpdates.setState({ checkError: _error });
      throw _error;
    })
    .finally(() => {
      _checking = undefined;
      _useUpdates.setState({ isChecking: false });
    }));
};

const _fetchUpdateAsync = async () => {
  if (!_checked) await _checkForUpdateAsync();
  const _update = _useUpdates.getState().availableUpdate;
  if (!_update) return { isNew: false, manifest: undefined };
  if (_downloaded?.update.updateId === _update.updateId) {
    return { isNew: false, manifest: _update.manifest };
  }
  const _stage = new Directory(
    Paths.cache,
    `app-updates-${_update.manifest.id}-${Date.now()}`
  );
  _useUpdates.setState({
    isDownloading: true,
    downloadError: undefined,
    downloadProgress: 0,
  });
  try {
    const _assets = [_update.manifest.launchAsset, ..._update.manifest.assets];
    _stage.create();
    for (const [_index, _asset] of _assets.entries()) {
      const _url = new URL(_asset.url, _manifestUrl);
      const _file = await File.downloadFileAsync(
        _url.toString(),
        new File(_stage, `${_asset.key}${_asset.fileExtension}`),
        { headers: _update.assetRequestHeaders?.[_asset.key] }
      );
      if (
        SHA256(CryptoJS.lib.WordArray.create(await _file.bytes())).toString(
          Base64url
        ) !== _asset.hash
      ) {
        throw new Error(`Asset verification failed: ${_asset.key}`);
      }
      _useUpdates.setState({ downloadProgress: (_index + 1) / _assets.length });
    }
    _downloaded?.directory.delete();
    _downloaded = { update: _update, directory: _stage };
    _useUpdates.setState({
      downloadedUpdate: _update,
      isUpdatePending: true,
    });
    return { isNew: true, manifest: _update.manifest };
  } catch (_error) {
    if (_stage.exists) _stage.delete();
    _useUpdates.setState({ downloadError: _error as Error });
    throw _error;
  } finally {
    _useUpdates.setState({ isDownloading: false });
  }
};

export default {
  ..._currentlyRunning,
  useUpdates: _useUpdates,
  checkForUpdateAsync: _checkForUpdateAsync,
  fetchUpdateAsync: () =>
    (_fetching ??= _fetchUpdateAsync().finally(() => {
      _fetching = undefined;
    })),
  reloadAsync: async () => {
    if (_fetching) await _fetching;
    if (!_downloaded) throw new Error('No downloaded package');
    _useUpdates.setState({ isRestarting: true });
    try {
      await _module.replace(
        JSON.stringify(_downloaded.update.manifest),
        _downloaded.directory.uri
      );
    } catch (_error) {
      _useUpdates.setState({
        isRestarting: false,
        downloadError: _error as Error,
      });
      throw _error;
    }
  },
};
