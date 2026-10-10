import CryptoKit
internal import ExpoModulesCore
import Foundation

private struct U0: Decodable {
  let a: String
  let b: String
  let c: String
  var v0: String { a + c }

  init(from decoder: Decoder) throws {
    let d = try decoder.container(keyedBy: U3.self)
    a = try d.decode(String.self, forKey: U3(0))
    b = try d.decode(String.self, forKey: U3(1))
    c = try d.decode(String.self, forKey: U3(2))
  }
}

private struct U1: Decodable {
  let a: String
  let b: String
  let c: String
  let d: U0
  let e: [U0]

  init(from decoder: Decoder) throws {
    let f = try decoder.container(keyedBy: U3.self)
    a = try f.decode(String.self, forKey: U3(3))
    b = try f.decode(String.self, forKey: U3(4))
    c = try f.decode(String.self, forKey: U3(5))
    d = try f.decode(U0.self, forKey: U3(6))
    e = try f.decode([U0].self, forKey: U3(7))
  }
}

private final class U2: GenericException<String>, @unchecked Sendable {
  override var code: String { UptF0(8) }
  override var reason: String { param }
}

private struct U3: CodingKey {
  let stringValue: String
  var intValue: Int? { nil }

  init(_ a: UInt) { stringValue = UptF0(a) }
  init?(stringValue: String) { self.stringValue = stringValue }
  init?(intValue: Int) { return nil }
}

internal final class Upt: Module, @unchecked Sendable {
  private static let a0 = Bundle.main.url(
    forResource: UptF0(9), withExtension: UptF0(10))
  private static let a1 =
    Bundle.main.object(forInfoDictionaryKey: UptF0(11)) as? String ?? ""
  private static let a2 = FileManager.default.urls(
    for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent(UptF0(12), isDirectory: true)
    .appendingPathComponent(
      "\(a1)-\(Bundle.main.object(forInfoDictionaryKey: UptF0(13)) as? String ?? "")",
      isDirectory: true
    )

  static func f0() -> URL? {
    if let a = try? Data(
      contentsOf: a2.appendingPathComponent(UptF0(14))),
      let b = try? JSONDecoder().decode(UUID.self, from: a),
      let c = try? f1(a2.appendingPathComponent(b.uuidString)),
      UUID(uuidString: c.a) != nil,
      c.c == a1
    {
      let d = a2.appendingPathComponent(b.uuidString).appendingPathComponent(c.d.v0)
      if FileManager.default.fileExists(atPath: d.path) { return d }
    }
    return nil
  }

  private static func f1(_ a: URL) throws -> U1 {
    try JSONDecoder().decode(
      U1.self,
      from: Data(
        contentsOf: a.appendingPathComponent(UptF0(15)))
    )
  }

  private static func f2(_ a: URL) throws -> String {
    Data(SHA256.hash(data: try Data(contentsOf: a, options: .mappedIfSafe))).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  func definition() -> ModuleDefinition {
    Name(UptF0(16))
    Function(UptF0(17)) {
      let a = (self.appContext?.bundleURL).flatMap { $0.isFileURL ? $0 : nil }
      let b = a?.deletingLastPathComponent()
      let c = b.flatMap { try? Self.f1($0) }
      let d =
        c?.b
        ?? Self.a0.flatMap {
          try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        }.map { ISO8601DateFormatter().string(from: $0) }
      return [
        UptF0(3): c?.a as Any? ?? NSNull(),
        UptF0(4): d as Any? ?? NSNull(),
        UptF0(1): a.flatMap { try? Self.f2($0) } ?? "",
        UptF0(5): Self.a1,
        UptF0(7): b.map { e in
          Dictionary(
            (c?.e ?? []).map {
              ($0.a, e.appendingPathComponent($0.v0).absoluteString)
            },
            uniquingKeysWith: { a, _ in a }
          )
        } ?? [:],
      ] as [String: Any]
    }

    AsyncFunction(UptF0(18)) { (a: String, b: URL) in
      guard let c = self.appContext else {
        throw Exceptions.AppContextLost()
      }
      let d = Data(a.utf8)
      let e = try JSONDecoder().decode(U1.self, from: d)
      guard UUID(uuidString: e.a) != nil, e.c == Self.a1,
        b.isFileURL
      else {
        throw U2("E01")
      }
      let f = try JSONSerialization.jsonObject(with: d) as? [String: Any]
      let g = f?[UptF0(19)] as? [String: Any]
      let h =
        g?[UptF0(20)] as? [String: Any] ?? g?[UptF0(21)] as? [String: Any]
      let i = h?[UptF0(22)] as? [String: Any]
      if let j = i?[UptF0(23)] as? String,
        j != Bundle.main.bundleIdentifier
      {
        throw U2("E02")
      }
      let k = FileManager.default
      guard
        ([e.d] + e.e).allSatisfy({ a in
          a.a.range(
            of: UptF0(24), options: .regularExpression) != nil
            && a.c.range(
              of: UptF0(25), options: .regularExpression)
              != nil
            && k.fileExists(atPath: b.appendingPathComponent(a.v0).path)
        }),
        try Self.f2(b.appendingPathComponent(e.d.v0)) == e.d.b
      else {
        throw U2("E03")
      }
      let l = UUID().uuidString
      try k.createDirectory(at: Self.a2, withIntermediateDirectories: true)
      try d.write(
        to: b.appendingPathComponent(UptF0(15)), options: .atomic
      )
      try k.moveItem(
        at: b, to: Self.a2.appendingPathComponent(l, isDirectory: true))
      try JSONEncoder().encode(l).write(
        to: Self.a2.appendingPathComponent(UptF0(14)),
        options: .atomic)
      c.reloadAppAsync(UptF0(26))
    }
  }
}
