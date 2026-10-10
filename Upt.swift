import CryptoKit
internal import ExpoModulesCore
import Foundation

private struct U0: Decodable {
  let key: String
  let hash: String
  let fileExtension: String
  var v0: String { key + fileExtension }
}

private struct U1: Decodable {
  let id: String
  let createdAt: String
  let runtimeVersion: String
  let launchAsset: U0
  let assets: [U0]
}

private final class U2: GenericException<String>, @unchecked Sendable {
  override var code: String { ["ER", "R_U", "PT_F", "AIL", "URE"].joined() }
  override var reason: String { param }
}

internal final class Upt: Module, @unchecked Sendable {
  private static let a0 = Bundle.main.url(
    forResource: ["ma", "in"].joined(), withExtension: ["jsb", "und", "le"].joined())
  private static let a1 =
    Bundle.main.object(
      forInfoDictionaryKey: ["CFB", "undleSh", "ortVer", "sionSt", "ring"].joined()) as? String
    ?? ""
  private static let a2 = FileManager.default.urls(
    for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent(["ap", "p-up", "dat", "es"].joined(), isDirectory: true)
    .appendingPathComponent(
      "\(a1)-\(Bundle.main.object(forInfoDictionaryKey: ["CFB", "und", "leVer", "sion"].joined()) as? String ?? "")",
      isDirectory: true
    )

  static func f0() -> URL? {
    if let a = try? Data(
      contentsOf: a2.appendingPathComponent(["act", "ive.j", "son"].joined())),
      let b = try? JSONDecoder().decode(UUID.self, from: a),
      let c = try? f1(a2.appendingPathComponent(b.uuidString)),
      UUID(uuidString: c.id) != nil,
      c.runtimeVersion == a1
    {
      let d = a2.appendingPathComponent(b.uuidString).appendingPathComponent(c.launchAsset.v0)
      if FileManager.default.fileExists(atPath: d.path) { return d }
    }
    return nil
  }

  private static func f1(_ a: URL) throws -> U1 {
    try JSONDecoder().decode(
      U1.self,
      from: Data(
        contentsOf: a.appendingPathComponent(["man", "ife", "st.j", "son"].joined()))
    )
  }

  private static func f2(_ a: URL) throws -> String {
    Data(SHA256.hash(data: try Data(contentsOf: a, options: .mappedIfSafe))).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  func definition() -> ModuleDefinition {
    Name(["u", "pt"].joined())
    Function(["getC", "urr", "ent"].joined()) {
      let a = (self.appContext?.bundleURL).flatMap { $0.isFileURL ? $0 : nil }
      let b = a?.deletingLastPathComponent()
      let c = b.flatMap { try? Self.f1($0) }
      let d =
        c?.createdAt
        ?? Self.a0.flatMap {
          try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        }.map { ISO8601DateFormatter().string(from: $0) }
      return [
        ["i", "d"].joined(): c?.id as Any? ?? NSNull(),
        ["cre", "ate", "dAt"].joined(): d as Any? ?? NSNull(),
        ["ha", "sh"].joined(): a.flatMap { try? Self.f2($0) } ?? "",
        ["runt", "imeV", "ersion"].joined(): Self.a1,
        ["as", "se", "ts"].joined(): b.map { e in
          Dictionary(
            (c?.assets ?? []).map {
              ($0.key, e.appendingPathComponent($0.v0).absoluteString)
            },
            uniquingKeysWith: { a, _ in a }
          )
        } ?? [:],
      ] as [String: Any]
    }

    AsyncFunction(["rep", "la", "ce"].joined()) { (a: String, b: URL) in
      guard let c = self.appContext else {
        throw Exceptions.AppContextLost()
      }
      let d = Data(a.utf8)
      let e = try JSONDecoder().decode(U1.self, from: d)
      guard UUID(uuidString: e.id) != nil, e.runtimeVersion == Self.a1,
        b.isFileURL
      else {
        throw U2(["E", "01"].joined())
      }
      let f = try JSONSerialization.jsonObject(with: d) as? [String: Any]
      let g = f?[["ex", "tra"].joined()] as? [String: Any]
      let h =
        g?[["exp", "oCl", "ient"].joined()] as? [String: Any] ?? g?[
          ["ex", "poCon", "fig"].joined()] as? [String: Any]
      let i = h?[["i", "os"].joined()] as? [String: Any]
      if let j = i?[["bun", "dleId", "enti", "fier"].joined()] as? String,
        j != Bundle.main.bundleIdentifier
      {
        throw U2(["E", "02"].joined())
      }
      let k = FileManager.default
      guard
        ([e.launchAsset] + e.assets).allSatisfy({ a in
          a.key.range(
            of: ["^[A-Z", "a-z0", "-9_-]", "+$"].joined(), options: .regularExpression) != nil
            && a.fileExtension.range(
              of: ["^\\.", "[A-Za", "-z0-9]", "+$"].joined(), options: .regularExpression)
              != nil
            && k.fileExists(atPath: b.appendingPathComponent(a.v0).path)
        }),
        try Self.f2(b.appendingPathComponent(e.launchAsset.v0)) == e.launchAsset.hash
      else {
        throw U2(["E", "03"].joined())
      }
      let l = UUID().uuidString
      try k.createDirectory(at: Self.a2, withIntermediateDirectories: true)
      try d.write(
        to: b.appendingPathComponent(["man", "ife", "st.j", "son"].joined()), options: .atomic
      )
      try k.moveItem(
        at: b, to: Self.a2.appendingPathComponent(l, isDirectory: true))
      try JSONEncoder().encode(l).write(
        to: Self.a2.appendingPathComponent(["act", "ive.j", "son"].joined()),
        options: .atomic)
      c.reloadAppAsync(["Pac", "kage ap", "plied"].joined())
    }
  }
}
