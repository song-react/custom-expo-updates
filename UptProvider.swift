internal import ExpoModulesCore
import Foundation

@objc(ExpoModulesProvider)
internal final class ExpoModulesProvider: ExpoBaseModulesProvider {
  override func getModuleClasses() -> [ExpoModuleTupleType] {
    super.getModuleClasses() + [(module: Upt.self, name: nil)]
  }

  override func getReactDelegateHandlers() -> [ExpoReactDelegateHandlerTupleType] {
    super.getReactDelegateHandlers() + [
      (
        packageName: ["u", "pt"].joined(),
        // 带 Swift 模块名查找，触发跨框架继承的处理器元数据加载。
        handler: NSClassFromString(
          [
            #fileID.split(separator: "/")[0], ".", "U", "pt", "Re", "actDe", "leg", "ateH",
            "andler",
          ]
          .joined()) as! ExpoReactDelegateHandler.Type
      )
    ]
  }
}
