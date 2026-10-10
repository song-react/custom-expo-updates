const {
  IOSConfig,
  withPodfile,
  withXcodeProject,
} = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

module.exports = _config => {
  _config = withPodfile(_config, _props => {
    _props.modResults.contents = _props.modResults.contents.replace(
      /use_expo_modules!(?:\([^)]*\))?/,
      "use_expo_modules!(:providerName => 'ExpoBaseModulesProvider.swift')"
    );
    return _props;
  });
  return withXcodeProject(_config, _props => {
    for (const _name of ['Upt.swift', 'UptProvider.swift', 'Upt.m', 'Upt.h']) {
      const _file = `${_props.modRequest.projectName}/${_name}`;
      fs.copyFileSync(
        path.join(__dirname, _name),
        path.join(_props.modRequest.platformProjectRoot, _file)
      );
      if (_name === 'Upt.h') continue;
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: _file,
        groupName: _props.modRequest.projectName,
        project: _props.modResults,
      });
    }
    const _header = path.join(
      _props.modRequest.platformProjectRoot,
      IOSConfig.XcodeUtils.unquote(
        _props.modResults.getBuildProperty(
          'SWIFT_OBJC_BRIDGING_HEADER',
          undefined,
          _props.modRequest.projectName
        )
      )
    );
    if (!fs.readFileSync(_header, 'utf8').includes('#import "Upt.h"')) {
      fs.appendFileSync(_header, '\n#import "Upt.h"\n');
    }
    return _props;
  });
};
