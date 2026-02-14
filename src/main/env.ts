import { release } from 'os'

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'

// macOS Tahoe = Darwin 25+
export const isMacTahoe =
  isMac && parseInt(release().split('.')[0], 10) >= 25
