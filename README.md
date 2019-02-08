wdio-video-reporter
===================

This is a reporter for [Webdriver IO v5](https://webdriver.io/) that generates videos of your wdio test executions. If you use allure, then the testcases automatically get decorated with the videos as well.

`wdio-video-reporter` listens on the [jsonWireProtocol](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol) and grabs a screenshot on the messagees that are "actions". When the test is doen it uses `ffmpeg` compiled in a `Docker` image to stitch these together to one `mp4` per test case. Docker is used for multi platform support.

Videos ends up in `wdio.config.outputDir`

Checkout example Allure report with included videos on failed tests here:
https://presidenten.github.io/wdio-video-reporter/

Pros:
- Nice videos in your allure reports. Yey.
- Slows down video, even though tests are fast.
- Works with selenium grid
- Works with all webdrivers that support `saveScreenshot`
- Tested on desktop browser Chrome, Firefox, Safari
- Tested on real IOS and Android devices through [Appium](http://appium.io/docs/en/about-appium/getting-started/)

Cons:
- Screenshots makes the tests slower. This is mitigated slightly by carefully choosing which jsonWireProtocol](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol) that should result in a screenshot
- Selenium drivers doesnt include alert-boxes and popups in screenshots, so they are not visible in the videos


Be sure to take a look at the boilerplate to quickly get up to speed:
https://github.com/presidenten/WebdriverIO-wdio-v5-boilerplate-with-videos-and-docker


Installation
============

Install docker
--------------
- Mac https://download.docker.com/mac/stable/Docker.dmg
- Win https://download.docker.com/win/stable/Docker%20for%20Windows%20Installer.exe
- Linux `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $USER`


Install the reporter
--------------------

`yarn add wdio-video-reporter`


Add the reporter 
----------------

At the top of the `wdio.conf.js`-file, require the library:
```
const video = require('wdio-video-reporter');
```

Then add the video reporter to the configuration in the reporters propertu:

```
 reporters: [
    [video, {
      saveAllVideos: false,       // If true, also saves videos for successful test cases
      videoSlowdownMultiplier: 3, // Higher to get slower videos, lower for faster videos [Value 1-100]
    }],
  ],
```

Adding the Allure reporter as well, automatically updates the reports with videos without any need to configure anything :-)

```
 reporters: [
    [video, {
      saveAllVideos: false,       // If true, also saves videos for successful test cases
      videoSlowdownMultiplier: 3, // Higher to get slower videos, lower for faster videos [Value 1-100]
    }],
    ['allure', {
      outputDir: './_results_/allure-raw',
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: true,
    }],s
  ],
```


Configuration
=============

Normal configuration parameters
-------------------------------

Most users may want to set these

- `saveAllVideos` Set to true to save videos for passing tests. Default: false
- `videoSlowdownMultiplier` Integer between [1-100]. Increase if videos are playing to quick. Default: 3
- `videoRenderTimeout` Max seconds to wait for a video to render. Default: 5
- `outputDir` If its not set, it uses wdio.config.outputDir. Default: undefined


Advanced configuration parameters
---------------------------------

Advanced users who want to change when the engine makes a screengrab can edit these. These arrays may be populated with the last word of a [jsonWireProtocol](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol) message, i.e. /session/:sessionId/`buttondown`.

- `addExcludedActions` Add actions where screenshots are unnecessary. Default: []
- `addJsonWireActions` Add actions where screenshots are missing. Default: []

To see processed messages, set `wdio.config.logLevel: 'debug'` and check `outputDir/wdio-0-0-Video-reporter.log`. This will also leave the screenshots output directory intact for review


Contributing
============

Fork, make changes, lint, build, and verify that changes work as they should, then make a PR.

The demo folder includes the built version of the library. 
It is possible to run a small set of tests which contains a few that passes and fails to verify the behaviour of the library.
