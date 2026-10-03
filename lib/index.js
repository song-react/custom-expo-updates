import CryptoJS from 'crypto-js/core';
import Base64url from 'crypto-js/enc-base64url';
import 'crypto-js/lib-typedarrays';
import SHA256 from 'crypto-js/sha256';
import { requireNativeModule } from 'expo';
import { Directory, File, Paths } from 'expo-file-system';
import { PixelRatio } from 'react-native';
import { create } from 'zustand';
const _module = requireNativeModule('Updates');
const {
  id: _updateId,
  createdAt: _createdAt,
  ..._current
} = _module.getCurrent();
const _manifestUrl = 'http://localhost:3000/api/manifest';
let _available;
let _downloaded;
if (!__DEV__ && Object.keys(_current.assets).length) {
  const _resolve =
    require('react-native/Libraries/Image/resolveAssetSource').default;
  // 图片、字体、音视频的 require 统一解析到完整下载的资源目录。
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
  checkError: undefined,
  availableUpdate: undefined,
  downloadedUpdate: undefined,
  isDownloading: false,
  downloadProgress: undefined,
  downloadError: undefined,
  isUpdatePending: false,
  isRestarting: false,
}));
let _fetching;
let _checking;
const _check = async () => {
  const _response = await fetch(_manifestUrl, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: 'application/expo+json, application/json, multipart/mixed',
      'expo-protocol-version': '1',
      'expo-platform': 'ios',
      'expo-runtime-version': _current.runtimeVersion,
    },
  });
  if (!_response.ok) throw new Error(`检查更新失败：HTTP ${_response.status}`);
  if (_response.status === 204) return;
  const _contentType = _response.headers.get('content-type') ?? '';
  const _text = await _response.text();
  let _manifest;
  let _assetRequestHeaders;
  if (/^multipart\/mixed\b/i.test(_contentType)) {
    const _boundary = _contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    const _delimiter = _boundary?.[1] ?? _boundary?.[2];
    if (!_delimiter || !_text.includes(`--${_delimiter}--`)) {
      throw new Error('更新响应的 multipart 格式无效');
    }
    const _parts = {};
    for (const _part of _text.split(`--${_delimiter}`).slice(1, -1)) {
      const [_headers, ..._body] = _part.split(/\r?\n\r?\n/);
      const _name = _headers.match(/\bname="?([^";\r\n]+)"?/i)?.[1];
      if (_name) {
        if (_name in _parts) throw new Error('更新响应包含重复内容');
        _parts[_name] = _body.join('\n\n').trim();
      }
    }
    if (_parts.directive) {
      if (JSON.parse(_parts.directive).type === 'noUpdateAvailable') return;
      throw new Error('不支持此更新指令');
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
    !Number.isFinite(_createdAt.getTime()) ||
    _manifest.runtimeVersion !== _current.runtimeVersion
  ) {
    throw new Error('更新与当前 App 版本不匹配或时间无效');
  }
  if (_createdAt.getTime() <= (_currentlyRunning.createdAt?.getTime() ?? 0))
    return;
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
  _available = undefined;
  _useUpdates.setState({ isChecking: true, checkError: undefined });
  return (_checking = _check()
    .then(_update => {
      _available = _update ?? null;
      _useUpdates.setState({ availableUpdate: _update });
      return { isAvailable: !!_update, manifest: _update?.manifest };
    })
    .catch(_error => {
      _useUpdates.setState({ checkError: _error });
      throw _error;
    })
    .finally(() => {
      _checking = undefined;
      _useUpdates.setState({ isChecking: false });
    }));
};
const _fetchUpdateAsync = async () => {
  if (_available === undefined) await _checkForUpdateAsync();
  const _update = _available;
  if (!_update) return { isNew: false, manifest: undefined };
  if (_downloaded?.update.createdAt.getTime() === _update.createdAt.getTime()) {
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
    if (
      !_assets.every(
        _asset =>
          _asset &&
          /^[A-Za-z0-9_-]+$/.test(_asset.key) &&
          /^\.[A-Za-z0-9]+$/.test(_asset.fileExtension) &&
          /^[A-Za-z0-9_-]{43}$/.test(_asset.hash) &&
          /^https?:$/.test(new URL(_asset.url, _manifestUrl).protocol)
      ) ||
      new Set(_assets.map(_asset => _asset.key + _asset.fileExtension)).size !==
        _assets.length
    ) {
      throw new Error('更新资源信息无效');
    }
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
        throw new Error(`更新文件校验失败：${_asset.key}`);
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
    _useUpdates.setState({ downloadError: _error });
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
    if (!_downloaded) throw new Error('暂无已下载的更新');
    _useUpdates.setState({ isRestarting: true });
    try {
      await _module.replace(
        JSON.stringify(_downloaded.update.manifest),
        _downloaded.directory.uri
      );
    } catch (_error) {
      _useUpdates.setState({
        isRestarting: false,
        downloadError: _error,
      });
      throw _error;
    }
  },
};
