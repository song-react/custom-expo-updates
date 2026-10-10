import CryptoJS from 'crypto-js/core';
import Base64url from 'crypto-js/enc-base64url';
import 'crypto-js/lib-typedarrays';
import SHA256 from 'crypto-js/sha256';
import { requireNativeModule } from 'expo';
import { applicationId } from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import { PixelRatio, type ImageResolvedAssetSource } from 'react-native';
import { create } from 'zustand';

// 泛型仅保留调用方类型，运行时代码只保存编码值。
const _s = <T extends string = string>(_a: number, _b: string) =>
  _b.replace(/../g, (_c, _i) =>
    String.fromCharCode(parseInt(_c, 16) ^ ((_a + (_i / 2) * 17) & 255))
  ) as T;
const _k = [
  _s<'getCurrent'>(71, '203d1d39feeedfdba194'),
  _s<'replace'>(114, '00e6e4c9d7a4bd'),
  _s<'manifest'>(157, 'f0cfd1b987977060'),
  _s<'useUpdates'>(200, 'bdaa8fae7c794f4b3512'),
  _s<'checkForUpdateAsync'>(243, '906c70455c0e36182efcf9cfcbb5a0817a7a46'),
  _s<'fetchUpdateAsync'>(30, '784a34320a26f4f1c7c3ad989982627e'),
  _s<'reloadAsync'>(73, '3b3f0713ecfaeeb3a88c90'),
  _s<'id'>(116, '1de1'),
  _s<'createdAt'>(159, 'fcc2a4b39791615753'),
  _s<'hash'>(202, 'a2ba9f95'),
  _s<'runtimeVersion'>(245, '8773795c50273e3a18fcecd9aebc'),
  _s<'assets'>(32, '414231361006'),
  _s<'updateId'>(75, '3e2c091ffbc5f8a6'),
  _s<'currentlyRunning'>(118, '15f2eadbdfa5a881875d555f2c3a0a12'),
  _s<'isChecking'>(161, 'c8c180bc80956c71475d'),
  _s<'checkError'>(204, 'afb58b9c7b6440313b17'),
  _s<'availableUpdate'>(247, '967e7843572d3f021ac5d1d6a2a080'),
  _s<'downloadedUpdate'>(34, '465c333b0a18e9fdcfdf99ad8a9e6444'),
  _s<'isDownloading'>(77, '242d2befe6ccdfabb4829e667e'),
  _s<'downloadProgress'>(120, '1ce6edc5d0a2bf8b50634d5436301504'),
  _s<'downloadError'>(163, 'c7dbb2b88b97687e6e4e3f311d'),
  _s<'isUpdatePending'>(206, 'a7aca57176424020060216edf3c5db'),
  _s<'isRestarting'>(249, '907949494e3a3e02f5fbcdd3'),
  _s<'isAvailable'>(36, '4d4607210910e6faced1ab'),
  _s<'isNew'>(79, '26133fe7e4'),
  _s<'launchAsset'>(122, '16eae9c3dda7a182717650'),
  _s<'extra'>(165, 'c0ceb3aa88'),
  _s<'expoClient'>(208, 'b599826c57495f22361d'),
  _s<'expoConfig'>(251, '9e746d417c3f0f14eaf3'),
  _s<'version'>(38, '50523a2a0314e2'),
  _s<'ios'>(81, '380d00'),
  _s<'bundleIdentifier'>(124, '1ef8f0cbacb4ab97617b525e2e300f09'),
  _s<'key'>(167, 'ccddb0'),
  _s<'fileExtension'>(210, 'b48a9860535f4c2c341815e2f0'),
  _s<'url'>(253, '887c73'),
  _s<'assetRequestHeaders'>(40, '494a393e182febeec5a4a197bc6077435d3b29'),
  _s<'directive'>(83, '370d07e3f4dcd0bcbe'),
  _s<'type'>(126, '0af6d0d4'),
  _s<'extensions'>(169, 'ccc2bfb9838d664f5f31'),
  _s<'downloadFileAsync'>(212, 'b08a816974465b2f1a0412eae1c2bbbd87'),
  _s<'uri'>(255, '8a6248'),
  _s(42, '5f4b38'),
  _s(
    85,
    '3d1203f8a38594a0b28d9e7c495d30205f45b7a89995aaac84d162415f2b350106f2'
  ),
  _s(
    128,
    'e1e1d2dfadb687836176441429251e10bbcbc1acbac9d666685956223f0c0ae6cfdfedb9979a683b08543f371814fefec2b5fd8e9d7d7343'
  ),
  _s(171, 'cec4bdb1c270634d472b36091ba5efcfc9bfb48191'),
  _s(214, 'b39f8866375b502c2a09efe3cf'),
  _s(1, '646a535b68241216fdf3c6d9e0a88a72624b5c2a'),
  _s(44, '4f52202b15efe68ec0bca682'),
  _s(87, '39072cfaffcdc9ab9e86607b4f55273a02'),
  _s(130, 'e3e3d498b3a78c987e7e5f10'),
] as const;

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

const _v0 = requireNativeModule<{
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
}>(_k[41]);
const { [_k[7]]: _v3, [_k[8]]: _v4, ..._v5 } = _v0[_k[0]]();
const _v6 = _k[42];
let _v7 = false;
let _v8: [Update, Directory] | undefined;

if (!__DEV__ && Object.keys(_v5[_k[11]]).length) {
  const _v9 = require('react-native/Libraries/Image/resolveAssetSource')
    .default as {
    pickScale: (_scales: number[], _deviceScale: number) => number;
    setCustomSourceTransformer: (
      _transformer: (_resolver: {
        asset: {
          scales: number[];
          hash: string;
          fileHashes?: string[];
        };
        fromSource: (_uri: string) => ImageResolvedAssetSource;
        defaultAsset: () => ImageResolvedAssetSource;
      }) => ImageResolvedAssetSource
    ) => void;
  };
  _v9.setCustomSourceTransformer(_v13 => {
    const _v15 = _v13.asset;
    const _v16 = _v9.pickScale(_v15.scales, PixelRatio.get());
    const _v17 =
      _v15.fileHashes?.[_v15.scales.indexOf(_v16)] ??
      _v15.fileHashes?.[0] ??
      _v15[_k[9]];
    const _v14 = _v5[_k[11]][_v17];
    return _v14 ? _v13.fromSource(_v14) : _v13.defaultAsset();
  });
}

const _v18 = {
  ..._v5,
  [_k[12]]: _v3,
  [_k[8]]: _v4 ? new Date(_v4) : null,
};

const _v19 = create(() => ({
  [_k[13]]: _v18,
  [_k[14]]: false,
  [_k[15]]: undefined as Error | undefined,
  [_k[16]]: undefined as Update | undefined,
  [_k[17]]: undefined as Update | undefined,
  [_k[18]]: false,
  [_k[19]]: undefined as number | undefined,
  [_k[20]]: undefined as Error | undefined,
  [_k[21]]: false,
  [_k[22]]: false,
}));
let _v20: ReturnType<typeof _v21> | undefined;
let _v22:
  | Promise<{
      isAvailable: boolean;
      manifest: Manifest | undefined;
    }>
  | undefined;

const _v23 = async (): Promise<Update | undefined> => {
  const _v24 = await fetch(_v6, {
    signal: AbortSignal.timeout(30000),
    headers: {
      accept: _k[43],
      [_k[44]]: '1',
      [_k[45]]: _k[30],
      [_k[46]]: _v5[_k[10]],
    },
  });
  if (!_v24.ok) throw new Error('J01');
  if (_v24.status === 204) return;
  const _v25 = _v24.headers.get(_k[47]) ?? '';
  const _v26 = await _v24.text();
  let _v27: Manifest;
  let _v28: Update['assetRequestHeaders'];
  if (/^multipart\/mixed\b/i.test(_v25)) {
    const _v29 = _v25.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    const _v30 = _v29?.[1] ?? _v29?.[2];
    if (!_v30 || !_v26.includes(`--${_v30}--`)) {
      throw new Error('J02');
    }
    const _v31: Record<string, string> = {};
    for (const _v32 of _v26.split(`--${_v30}`).slice(1, -1)) {
      const [_v33, ..._v34] = _v32.split(/\r?\n\r?\n/);
      const _v35 = _v33.match(/\bname="?([^";\r\n]+)"?/i)?.[1];
      if (_v35) {
        if (_v35 in _v31) throw new Error('J03');
        _v31[_v35] = _v34.join('\n\n').trim();
      }
    }
    if (_v31[_k[36]]) {
      if (JSON.parse(_v31[_k[36]])[_k[37]] === _k[48]) return;
      throw new Error('J04');
    }
    _v27 = JSON.parse(_v31[_k[2]]);
    _v28 = _v31[_k[38]] ? JSON.parse(_v31[_k[38]])[_k[35]] : undefined;
  } else {
    _v27 = JSON.parse(_v26);
  }
  const _v4 = new Date(_v27[_k[8]]);
  if (
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(_v27[_k[7]]) ||
    !Array.isArray(_v27[_k[11]]) ||
    !Number.isFinite(_v4.getTime())
  ) {
    throw new Error('J05');
  }
  const _v36 = _v27[_k[26]]?.[_k[27]] ?? _v27[_k[26]]?.[_k[28]];
  if (
    !applicationId ||
    !_v5[_k[10]] ||
    _v27[_k[10]] !== _v5[_k[10]] ||
    _v36?.[_k[29]] !== _v5[_k[10]] ||
    _v36?.[_k[30]]?.[_k[31]] !== applicationId ||
    !(_v4.getTime() > (_v18[_k[8]]?.getTime() ?? NaN))
  ) {
    return;
  }
  const _v37 = [_v27[_k[25]], ..._v27[_k[11]]];
  if (
    !_v37.every(
      _v15 =>
        _v15 &&
        typeof _v15[_k[32]] === 'string' &&
        /^[A-Za-z0-9_-]+$/.test(_v15[_k[32]]) &&
        typeof _v15[_k[33]] === 'string' &&
        /^\.[A-Za-z0-9]+$/.test(_v15[_k[33]]) &&
        typeof _v15[_k[9]] === 'string' &&
        /^[A-Za-z0-9_-]{43}$/.test(_v15[_k[9]]) &&
        typeof _v15[_k[34]] === 'string' &&
        /^https?:$/.test(new URL(_v15[_k[34]], _v6).protocol)
    ) ||
    new Set(_v37.map(_v15 => _v15[_k[32]] + _v15[_k[33]])).size !== _v37.length
  ) {
    throw new Error('J06');
  }
  return {
    [_k[12]]: _v27[_k[7]],
    [_k[10]]: _v27[_k[10]],
    [_k[8]]: _v4,
    [_k[2]]: _v27,
    [_k[35]]: _v28,
  };
};

const _v38 = () => {
  if (_v22) return _v22;
  _v7 = false;
  _v19.setState({
    [_k[14]]: true,
    [_k[15]]: undefined,
    [_k[16]]: undefined,
  });
  return (_v22 = _v23()
    .then(_v39 => {
      _v7 = true;
      _v19.setState({ [_k[16]]: _v39 });
      return { [_k[23]]: !!_v39, [_k[2]]: _v39?.[_k[2]] };
    })
    .catch((_v40: Error) => {
      _v19.setState({ [_k[15]]: _v40 });
      throw _v40;
    })
    .finally(() => {
      _v22 = undefined;
      _v19.setState({ [_k[14]]: false });
    }));
};

const _v21 = async () => {
  if (!_v7) await _v38();
  const _v39 = _v19.getState()[_k[16]];
  if (!_v39) return { [_k[24]]: false, [_k[2]]: undefined };
  if (_v8?.[0][_k[12]] === _v39[_k[12]]) {
    return { [_k[24]]: false, [_k[2]]: _v39[_k[2]] };
  }
  const _v41 = new Directory(
    Paths.cache,
    `${_k[49]}${_v39[_k[2]][_k[7]]}-${Date.now()}`
  );
  _v19.setState({
    [_k[18]]: true,
    [_k[20]]: undefined,
    [_k[19]]: 0,
  });
  try {
    const _v37 = [_v39[_k[2]][_k[25]], ..._v39[_k[2]][_k[11]]];
    _v41.create();
    for (const [_v42, _v15] of _v37.entries()) {
      const _v43 = new URL(_v15[_k[34]], _v6);
      const _v44 = await File[_k[39]](
        _v43.toString(),
        new File(_v41, `${_v15[_k[32]]}${_v15[_k[33]]}`),
        { headers: _v39[_k[35]]?.[_v15[_k[32]]] }
      );
      if (
        SHA256(CryptoJS.lib.WordArray.create(await _v44.bytes())).toString(
          Base64url
        ) !== _v15[_k[9]]
      ) {
        throw new Error('J07');
      }
      _v19.setState({ [_k[19]]: (_v42 + 1) / _v37.length });
    }
    _v8?.[1].delete();
    _v8 = [_v39, _v41];
    _v19.setState({
      [_k[17]]: _v39,
      [_k[21]]: true,
    });
    return { [_k[24]]: true, [_k[2]]: _v39[_k[2]] };
  } catch (_v40) {
    if (_v41.exists) _v41.delete();
    _v19.setState({ [_k[20]]: _v40 as Error });
    throw _v40;
  } finally {
    _v19.setState({ [_k[18]]: false });
  }
};

export default {
  ..._v18,
  [_k[3]]: _v19,
  [_k[4]]: _v38,
  [_k[5]]: () =>
    (_v20 ??= _v21().finally(() => {
      _v20 = undefined;
    })),
  [_k[6]]: async () => {
    if (_v20) await _v20;
    if (!_v8) throw new Error('J08');
    _v19.setState({ [_k[22]]: true });
    try {
      await _v0[_k[1]](JSON.stringify(_v8[0][_k[2]]), _v8[1][_k[40]]);
    } catch (_v40) {
      _v19.setState({
        [_k[22]]: false,
        [_k[20]]: _v40 as Error,
      });
      throw _v40;
    }
  },
};
