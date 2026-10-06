# @song-react/custom-expo-updates

适用于 **Expo 57 / React Native 0.86 / iOS** 的轻量热更新库，不依赖 `expo-updates`。

检查和下载由 JS 主动发起；按 `createdAt` 判断新包，每下载一个文件校验一次 SHA-256，全部成功后才允许切换。原生层保存更新并复用 Expo 的 reload 能力，后续冷启动继续运行已启用的包。

## 接入

```sh
bun add github:song-react/custom-expo-updates
bunx expo install expo-file-system expo-application
```

在 `app.config.ts` 的 `plugins` 中加入 `'@song-react/custom-expo-updates'`，然后执行 `bunx expo prebuild --platform ios` 并重新构建原生 App。库通过 config plugin 注册原生模块；不要同时注册旧的 `@app/updates` 插件。

仅验证了 Expo 57。依赖 Expo Modules 的原生项目可使用，Expo Go 无法加载这个自定义模块。Debug 继续使用 Metro，完整更新流程需要 Release 包。

## 服务与 API

固定请求 `http://localhost:3000/api/manifest`，兼容 [custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server) 的 JSON / multipart manifest。业务项目需要在检查前准备本地代理，例如通过 `react-native-gcd-webserver` 把 localhost 映射到当前更新线路；库不包含线路选择、弹窗或等待天数。

```ts
import Updates from '@song-react/custom-expo-updates';

const result = await Updates.checkForUpdateAsync();
if (result.isAvailable) {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}
```

- `Updates.runtimeVersion`：当前 App 的版本号，用于请求同版本目录。
- `Updates.updateId`：当前 OTA 的 ID；内置包为 `null`。
- `Updates.createdAt`：当前运行包的时间，类型为 `Date | null`。
- `Updates.useUpdates()`：订阅 `currentlyRunning`、`availableUpdate`、`downloadedUpdate`、`isChecking`、`checkError`、`isDownloading`、`downloadProgress`、`downloadError`、`isUpdatePending` 和 `isRestarting`。

只有 manifest 的 `runtimeVersion`、`extra.expoClient`（或 `extra.expoConfig`）中的 `version` 与当前原生 App 版本相同，`ios.bundleIdentifier` 与当前原生 Bundle ID 相同，且 `createdAt` 严格晚于当前包时间时，才返回 `isAvailable: true` 并设置 `availableUpdate`。缺少匹配信息或当前包时间时视为没有更新；新检查会先清空旧的 `availableUpdate`。资产 metadata 也在检查阶段验证，下载时继续校验 SHA-256。

内置包时间取 bundle 的构建修改时间。本地缓存目录仅包含 App 版本和 `buildNumber`，不参与更新包的时间比较。下载完成不会修改当前运行信息，调用 `reloadAsync()` 切换成功后才读取新包信息。

保持 App 与更新包的原生依赖一致；修改原生代码或依赖时，应升级 App 版本并重新构建。没有后台检查、签名认证、数据库或失败回滚；SHA-256 只验证文件与 manifest 一致，不提供 manifest 身份认证。

## 维护

```sh
bun install
bun run build
```

`lib` 包含已生成的 JS 和类型声明，GitHub 安装无需执行构建脚本。项目依赖建议固定到验证过的 commit，发布后不移动版本标签。
