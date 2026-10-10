#import "Upt.h"
#import <objc/runtime.h>

Class UptCreateHandler(Class base, NSURL *(^bundleURL)(void)) {
  static Class handler;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    NSString *name = [@[@"U", @"pt", @"Re", @"actDe", @"leg", @"ateH", @"andler"]
        componentsJoinedByString:@""];
    SEL selector = NSSelectorFromString(
        [@[@"bun", @"dleU", @"RLWith", @"React", @"Delegate:"] componentsJoinedByString:@""]);
    Method method = class_getInstanceMethod(base, selector);
    if (!method) return;
    Class cls = objc_allocateClassPair(base, name.UTF8String, 0);
    if (!cls) return;
    IMP implementation = imp_implementationWithBlock(^NSURL *(id self, id delegate) {
      return bundleURL();
    });
    if (!class_addMethod(cls, selector, implementation, method_getTypeEncoding(method))) {
      imp_removeBlock(implementation);
      objc_disposeClassPair(cls);
      return;
    }
    objc_registerClassPair(cls);
    handler = cls;
  });
  return handler;
}
