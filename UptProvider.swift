internal import ExpoModulesCore
import Foundation

// Expo 从 Swift 调用该方法，需要 dynamic 将调用转到 OC 动态子类。
private class UptDelegate: ExpoReactDelegateHandler {
  override dynamic func bundleURL(reactDelegate: ExpoReactDelegate) -> URL? { nil }
}

@objc(ExpoModulesProvider)
internal final class ExpoModulesProvider: ExpoBaseModulesProvider {
  override func getModuleClasses() -> [ExpoModuleTupleType] {
    super.getModuleClasses() + [(module: Upt.self, name: nil)]
  }

  override func getReactDelegateHandlers() -> [ExpoReactDelegateHandlerTupleType] {
    super.getReactDelegateHandlers() + [
      (
        packageName: ["u", "pt"].joined(),
        handler: UptCreateHandler(UptDelegate.self) {
          #if DEBUG
            return nil
          #else
            return Upt.bundleURL()
          #endif
        } as! ExpoReactDelegateHandler.Type
      )
    ]
  }
}
