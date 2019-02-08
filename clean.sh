#!/bin/bash

sed -i -E 's/^f.*interopDefault[^\}]*\}//g' dist/wdio-video-reporter.js
sed -i -E 's/_interopDefault\((.*)\)/\1/g' dist/wdio-video-reporter.js
