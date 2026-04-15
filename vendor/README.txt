This directory stores pre-downloaded electron-builder binaries for offline use.

Put the following files here if automatic download fails:
- winCodeSign-2.6.0.7z
- nsis-3.0.4.1.7z
- nsis-resources-3.4.1.7z

Download from Huawei mirror:
https://mirrors.huaweicloud.com/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z
https://mirrors.huaweicloud.com/electron-builder-binaries/nsis-3.0.4.1/nsis-3.0.4.1.7z
https://mirrors.huaweicloud.com/electron-builder-binaries/nsis-resources-3.4.1/nsis-resources-3.4.1.7z

Or from npmmirror:
https://registry.npmmirror.com/binary.html?path=electron-builder-binaries/

build.bat will auto-copy them to electron-builder cache before packaging.
