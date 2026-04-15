This directory stores pre-downloaded electron-builder binaries for offline use.

Put the following files here if automatic download fails:
- winCodeSign-2.6.0.7z
- nsis-3.0.4.1.7z
- nsis-resources-3.4.1.7z

Download from Huawei mirror:
https://mirrors.huaweicloud.com/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z
https://mirrors.huaweicloud.com/electron-builder-binaries/nsis-3.0.4.1/nsis-3.0.4.1.7z
https://mirrors.huaweicloud.com/electron-builder-binaries/nsis-resources-3.4.1/nsis-resources-3.4.1.7z

Prerequisite: 7-Zip must be installed (https://7-zip.org) for auto-extraction.
build.bat will extract vendor/*.7z to electron-builder cache directory before packaging.
