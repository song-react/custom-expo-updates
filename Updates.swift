import CryptoKit
internal import ExpoModulesCore
import Foundation

private struct UpdateAsset: Decodable {
  let key: String
  let hash: String
  let fileExtension: String
  var filename: String { key + fileExtension }
}

private struct UpdateManifest: Decodable {
  let id: String
  let createdAt: String
  let runtimeVersion: String
  let launchAsset: UpdateAsset
  let assets: [UpdateAsset]
}

private final class UpdateFailure: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

internal final class Updates: Module, @unchecked Sendable {
  private static let embeddedURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  private static let runtimeVersion =
    Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
  private static let directory = FileManager.default.urls(
    for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("app-updates", isDirectory: true)
    .appendingPathComponent(
      "\(runtimeVersion)-\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "")",
      isDirectory: true
    )

  static func bundleURL() -> URL? {
    if let data = try? Data(contentsOf: directory.appendingPathComponent("active.json")),
      let folder = try? JSONDecoder().decode(UUID.self, from: data),
      let manifest = try? manifest(at: directory.appendingPathComponent(folder.uuidString)),
      UUID(uuidString: manifest.id) != nil,
      manifest.runtimeVersion == runtimeVersion
    {
      let url = directory.appendingPathComponent(folder.uuidString).appendingPathComponent(
        manifest.launchAsset.filename)
      if FileManager.default.fileExists(atPath: url.path) { return url }
    }
    return nil
  }

  private static func manifest(at directory: URL) throws -> UpdateManifest {
    try JSONDecoder().decode(
      UpdateManifest.self, from: Data(contentsOf: directory.appendingPathComponent("manifest.json"))
    )
  }

  private static func contentHash(_ url: URL) throws -> String {
    Data(SHA256.hash(data: try Data(contentsOf: url, options: .mappedIfSafe))).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  func definition() -> ModuleDefinition {
    Name("Updates")
    Function("getCurrent") {
      let url = (self.appContext?.bundleURL).flatMap { $0.isFileURL ? $0 : nil }
      let directory = url?.deletingLastPathComponent()
      let manifest = directory.flatMap { try? Self.manifest(at: $0) }
      let createdAt =
        manifest?.createdAt
        ?? Self.embeddedURL.flatMap {
          try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        }.map { ISO8601DateFormatter().string(from: $0) }
      return [
        "id": manifest?.id as Any? ?? NSNull(),
        "createdAt": createdAt as Any? ?? NSNull(),
        "hash": url.flatMap { try? Self.contentHash($0) } ?? "",
        "runtimeVersion": Self.runtimeVersion,
        "assets": directory.map { directory in
          Dictionary(
            (manifest?.assets ?? []).map {
              ($0.key, directory.appendingPathComponent($0.filename).absoluteString)
            },
            uniquingKeysWith: { first, _ in first }
          )
        } ?? [:],
      ] as [String: Any]
    }

    AsyncFunction("replace") { (manifestJSON: String, staging: URL) in
      guard let appContext = self.appContext else {
        throw Exceptions.AppContextLost()
      }
      let data = Data(manifestJSON.utf8)
      let manifest = try JSONDecoder().decode(UpdateManifest.self, from: data)
      guard UUID(uuidString: manifest.id) != nil, manifest.runtimeVersion == Self.runtimeVersion,
        staging.isFileURL
      else {
        throw UpdateFailure("Invalid manifest or local directory")
      }
      let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      let extra = raw?["extra"] as? [String: Any]
      let config = extra?["expoClient"] as? [String: Any] ?? extra?["expoConfig"] as? [String: Any]
      let ios = config?["ios"] as? [String: Any]
      if let bundleIdentifier = ios?["bundleIdentifier"] as? String,
        bundleIdentifier != Bundle.main.bundleIdentifier
      {
        throw UpdateFailure("Application identifier mismatch")
      }
      let manager = FileManager.default
      guard
        ([manifest.launchAsset] + manifest.assets).allSatisfy({ asset in
          asset.key.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil
            && asset.fileExtension.range(of: "^\\.[A-Za-z0-9]+$", options: .regularExpression)
              != nil
            && manager.fileExists(atPath: staging.appendingPathComponent(asset.filename).path)
        }),
        try Self.contentHash(staging.appendingPathComponent(manifest.launchAsset.filename))
          == manifest.launchAsset.hash
      else {
        throw UpdateFailure("Invalid local assets")
      }
      let folder = UUID().uuidString
      try manager.createDirectory(at: Self.directory, withIntermediateDirectories: true)
      try data.write(to: staging.appendingPathComponent("manifest.json"), options: .atomic)
      try manager.moveItem(
        at: staging, to: Self.directory.appendingPathComponent(folder, isDirectory: true))
      try JSONEncoder().encode(folder).write(
        to: Self.directory.appendingPathComponent("active.json"), options: .atomic)
      appContext.reloadAppAsync("Package applied")
    }
  }
}

internal final class UpdatesReactDelegateHandler: ExpoReactDelegateHandler {
  override func bundleURL(reactDelegate: ExpoReactDelegate) -> URL? {
    #if DEBUG
      return nil
    #else
      return Updates.bundleURL()
    #endif
  }
}
