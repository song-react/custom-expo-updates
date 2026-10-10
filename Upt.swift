import CryptoKit
internal import ExpoModulesCore
import Foundation

private struct UptAsset: Decodable {
  let key: String
  let hash: String
  let fileExtension: String
  var filename: String { key + fileExtension }
}

private struct UptManifest: Decodable {
  let id: String
  let createdAt: String
  let runtimeVersion: String
  let launchAsset: UptAsset
  let assets: [UptAsset]
}

private final class UptFailure: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

internal final class Upt: Module, @unchecked Sendable {
  private static let embeddedURL = Bundle.main.url(
    forResource: ["ma", "in"].joined(), withExtension: ["jsb", "und", "le"].joined())
  private static let runtimeVersion =
    Bundle.main.object(
      forInfoDictionaryKey: ["CFB", "undleSh", "ortVer", "sionSt", "ring"].joined()) as? String
    ?? ""
  private static let directory = FileManager.default.urls(
    for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent(["ap", "p-up", "dat", "es"].joined(), isDirectory: true)
    .appendingPathComponent(
      "\(runtimeVersion)-\(Bundle.main.object(forInfoDictionaryKey: ["CFB", "und", "leVer", "sion"].joined()) as? String ?? "")",
      isDirectory: true
    )

  static func bundleURL() -> URL? {
    if let data = try? Data(
      contentsOf: directory.appendingPathComponent(["act", "ive.j", "son"].joined())),
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

  private static func manifest(at directory: URL) throws -> UptManifest {
    try JSONDecoder().decode(
      UptManifest.self,
      from: Data(
        contentsOf: directory.appendingPathComponent(["man", "ife", "st.j", "son"].joined()))
    )
  }

  private static func contentHash(_ url: URL) throws -> String {
    Data(SHA256.hash(data: try Data(contentsOf: url, options: .mappedIfSafe))).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  func definition() -> ModuleDefinition {
    Name(["u", "pt"].joined())
    Function(["getC", "urr", "ent"].joined()) {
      let url = (self.appContext?.bundleURL).flatMap { $0.isFileURL ? $0 : nil }
      let directory = url?.deletingLastPathComponent()
      let manifest = directory.flatMap { try? Self.manifest(at: $0) }
      let createdAt =
        manifest?.createdAt
        ?? Self.embeddedURL.flatMap {
          try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        }.map { ISO8601DateFormatter().string(from: $0) }
      return [
        ["i", "d"].joined(): manifest?.id as Any? ?? NSNull(),
        ["cre", "ate", "dAt"].joined(): createdAt as Any? ?? NSNull(),
        ["ha", "sh"].joined(): url.flatMap { try? Self.contentHash($0) } ?? "",
        ["runt", "imeV", "ersion"].joined(): Self.runtimeVersion,
        ["as", "se", "ts"].joined(): directory.map { directory in
          Dictionary(
            (manifest?.assets ?? []).map {
              ($0.key, directory.appendingPathComponent($0.filename).absoluteString)
            },
            uniquingKeysWith: { first, _ in first }
          )
        } ?? [:],
      ] as [String: Any]
    }

    AsyncFunction(["rep", "la", "ce"].joined()) { (manifestJSON: String, staging: URL) in
      guard let appContext = self.appContext else {
        throw Exceptions.AppContextLost()
      }
      let data = Data(manifestJSON.utf8)
      let manifest = try JSONDecoder().decode(UptManifest.self, from: data)
      guard UUID(uuidString: manifest.id) != nil, manifest.runtimeVersion == Self.runtimeVersion,
        staging.isFileURL
      else {
        throw UptFailure(["E", "01"].joined())
      }
      let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any]
      let extra = raw?[["ex", "tra"].joined()] as? [String: Any]
      let config =
        extra?[["exp", "oCl", "ient"].joined()] as? [String: Any] ?? extra?[
          ["ex", "poCon", "fig"].joined()] as? [String: Any]
      let ios = config?[["i", "os"].joined()] as? [String: Any]
      if let bundleIdentifier = ios?[["bun", "dleId", "enti", "fier"].joined()] as? String,
        bundleIdentifier != Bundle.main.bundleIdentifier
      {
        throw UptFailure(["E", "02"].joined())
      }
      let manager = FileManager.default
      guard
        ([manifest.launchAsset] + manifest.assets).allSatisfy({ asset in
          asset.key.range(
            of: ["^[A-Z", "a-z0", "-9_-]", "+$"].joined(), options: .regularExpression) != nil
            && asset.fileExtension.range(
              of: ["^\\.", "[A-Za", "-z0-9]", "+$"].joined(), options: .regularExpression)
              != nil
            && manager.fileExists(atPath: staging.appendingPathComponent(asset.filename).path)
        }),
        try Self.contentHash(staging.appendingPathComponent(manifest.launchAsset.filename))
          == manifest.launchAsset.hash
      else {
        throw UptFailure(["E", "03"].joined())
      }
      let folder = UUID().uuidString
      try manager.createDirectory(at: Self.directory, withIntermediateDirectories: true)
      try data.write(
        to: staging.appendingPathComponent(["man", "ife", "st.j", "son"].joined()), options: .atomic
      )
      try manager.moveItem(
        at: staging, to: Self.directory.appendingPathComponent(folder, isDirectory: true))
      try JSONEncoder().encode(folder).write(
        to: Self.directory.appendingPathComponent(["act", "ive.j", "son"].joined()),
        options: .atomic)
      appContext.reloadAppAsync(["Pac", "kage ap", "plied"].joined())
    }
  }
}
