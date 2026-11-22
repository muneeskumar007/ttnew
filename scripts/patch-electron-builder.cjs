/**
 * Postinstall patch for electron-builder / builder-util on Windows environments
 * with Windows Defender Application Control (WDAC) / Device Guard.
 */
const fs = require('fs');
const path = require('path');

function patchFile(filePath, searchStr, replaceStr) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(replaceStr)) {
    return; // Already patched
  }
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Patch] Successfully patched: ${path.relative(process.cwd(), filePath)}`);
  }
}

// 1. Patch builder-util to merge process.env on Windows
const builderUtilPath = path.join(__dirname, '..', 'node_modules', 'builder-util', 'out', 'util.js');
patchFile(
  builderUtilPath,
  'if (process.platform === "win32") {\n        return env == null ? undefined : env;\n    }',
  'if (process.platform === "win32") {\n        return env == null ? undefined : { ...process.env, ...env };\n    }'
);

// 2. Patch WineVm.js to merge process.env on Windows
const wineVmPath = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'out', 'vm', 'WineVm.js');
patchFile(
  wineVmPath,
  'if (process.platform === "win32") {\n            return (0, builder_util_1.exec)(target, appArgs, options);\n        }',
  'if (process.platform === "win32") {\n            return (0, builder_util_1.exec)(target, appArgs, { ...options, env: options.env ? { ...process.env, ...options.env } : undefined });\n        }'
);

// 3. Patch NsisTarget.js to safely extract uninstaller with 7z when direct execution is blocked
const nsisTargetPath = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'out', 'targets', 'nsis', 'NsisTarget.js');
patchFile(
  nsisTargetPath,
  'await wineVm.exec(installerPath, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });',
  `try {
                await wineVm.exec(installerPath, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });
            } catch (err) {
                let zPath = path.resolve(this.packager.projectDir, "node_modules/electron-winstaller/vendor/7z-x64.exe");
                if (!fs.existsSync(zPath)) {
                    zPath = path.resolve(__dirname, "../../../../node_modules/electron-winstaller/vendor/7z-x64.exe");
                }
                if (!fs.existsSync(zPath) && process.env.ELECTRON_BUILDER_7ZIP_PATH) {
                    zPath = process.env.ELECTRON_BUILDER_7ZIP_PATH;
                }
                const tempUnpack = path.join(this.outDir, "__uninst_tmp_" + Date.now());
                try {
                    await (0, builder_util_1.exec)(zPath, ["x", installerPath, \`-o\${tempUnpack}\`, "-y"]);
                    async function findUninst(dir) {
                        const items = await (0, fs_extra_1.readdir)(dir, { withFileTypes: true });
                        for (const it of items) {
                            const full = path.join(dir, it.name);
                            if (it.isDirectory()) {
                                const found = await findUninst(full);
                                if (found) return found;
                            } else if (it.name.endsWith("__uninstaller.exe")) {
                                return full;
                            }
                        }
                        return null;
                    }
                    const targetFile = await findUninst(tempUnpack);
                    if (targetFile) {
                        await (0, fs_extra_1.copyFile)(targetFile, uninstallerPath);
                        await (0, fs_extra_1.remove)(tempUnpack);
                    } else {
                        throw err;
                    }
                } catch (_e) {
                    throw err;
                }
            }`
);
