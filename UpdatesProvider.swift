internal import ExpoModulesCore

@objc(ExpoModulesProvider)
internal final class ExpoModulesProvider: ExpoBaseModulesProvider {
  override func getModuleClasses() -> [ExpoModuleTupleType] {
    super.getModuleClasses() + [(module: Updates.self, name: nil)]
  }

  override func getReactDelegateHandlers() -> [ExpoReactDelegateHandlerTupleType] {
    super.getReactDelegateHandlers() + [
      (packageName: "@song-react/custom-expo-updates", handler: UpdatesReactDelegateHandler.self)
    ]
  }
}
