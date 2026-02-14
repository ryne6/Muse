const path = require('path')
const fs = require('fs')
const glob = require('fast-glob')

exports.default = async function (context) {
  const appOutDir = context.appOutDir
  const platform = context.electronPlatformName

  if (platform !== 'darwin') return

  const resourcesDir = path.join(appOutDir, 'Muse.app/Contents/Resources')
  const frameworksDir = path.join(appOutDir, 'Muse.app/Contents/Frameworks')

  // 1. Clean node_modules junk files in asar.unpacked
  const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked')
  if (fs.existsSync(unpackedDir)) {
    const junkPatterns = [
      '**/README.md', '**/README', '**/readme.md',
      '**/CHANGELOG.md', '**/CHANGELOG', '**/HISTORY.md',
      '**/LICENSE', '**/LICENSE.md', '**/LICENSE.txt', '**/license',
      '**/.github/**', '**/.eslintrc*', '**/.prettierrc*',
      '**/tsconfig.json', '**/tsconfig.*.json',
      '**/test/**', '**/__tests__/**', '**/tests/**',
      '**/*.d.ts', '**/*.map',
      '**/.npmignore', '**/.gitignore',
      '**/docs/**', '**/doc/**',
      '**/example/**', '**/examples/**',
      '**/*.c', '**/*.cc', '**/*.cpp', '**/*.h', '**/*.gyp', '**/*.gypi',
      '**/Makefile', '**/binding.gyp',
    ]

    const junkFiles = await glob(junkPatterns, {
      cwd: unpackedDir,
      absolute: true,
      dot: true
    })

    let cleanedSize = 0
    for (const file of junkFiles) {
      try {
        const stat = fs.statSync(file)
        cleanedSize += stat.size
        fs.unlinkSync(file)
      } catch (e) {
        // ignore
      }
    }
    console.log(`  • afterPack: cleaned ${junkFiles.length} junk files (${(cleanedSize / 1024 / 1024).toFixed(1)}MB) from asar.unpacked`)
  }

  // 2. Clean Electron locale files (keep only English)
  const localesDir = path.join(
    frameworksDir,
    'Electron Framework.framework/Versions/A/Resources'
  )

  if (fs.existsSync(localesDir)) {
    const keepLocales = ['en.lproj']
    const entries = fs.readdirSync(localesDir)
    let removedCount = 0

    for (const entry of entries) {
      if (entry.endsWith('.lproj') && !keepLocales.includes(entry)) {
        fs.rmSync(path.join(localesDir, entry), { recursive: true })
        removedCount++
      }
    }
    console.log(`  • afterPack: removed ${removedCount} locale directories (kept: ${keepLocales.join(', ')})`)
  }

  // 3. Remove Vulkan software renderer (not needed for coding assistant)
  const swiftshaderLib = path.join(
    frameworksDir,
    'Electron Framework.framework/Versions/A/Libraries/libvk_swiftshader.dylib'
  )
  const swiftshaderJson = path.join(
    frameworksDir,
    'Electron Framework.framework/Versions/A/Libraries/vk_swiftshader_icd.json'
  )
  if (fs.existsSync(swiftshaderLib)) {
    const stat = fs.statSync(swiftshaderLib)
    fs.unlinkSync(swiftshaderLib)
    console.log(`  • afterPack: removed libvk_swiftshader.dylib (${(stat.size / 1024 / 1024).toFixed(1)}MB)`)
  }
  if (fs.existsSync(swiftshaderJson)) fs.unlinkSync(swiftshaderJson)
}
