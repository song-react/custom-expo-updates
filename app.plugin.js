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
    for (const _name of ['Updates.swift', 'UpdatesProvider.swift']) {
      const _file = `${_props.modRequest.projectName}/${_name}`;
      fs.copyFileSync(
        path.join(__dirname, _name),
        path.join(_props.modRequest.platformProjectRoot, _file)
      );
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: _file,
        groupName: _props.modRequest.projectName,
        project: _props.modResults,
      });
    }
    return _props;
  });
};
