import { promises as fs } from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';

async function walkDir(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        const res = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            await walkDir(res);
        } else {
            if (res.endsWith('.ts') || res.endsWith('.tsx')) {
                // Read the file
                const code = await fs.readFile(res, 'utf8');

                // Determine new extension
                const newExt = res.endsWith('.tsx') ? '.jsx' : '.js';
                const newPath = res.replace(/\.tsx?$/, newExt);

                try {
                    // Transform with esbuild to strip types
                    const result = await esbuild.transform(code, {
                        loader: res.endsWith('.tsx') ? 'tsx' : 'ts',
                        jsx: 'preserve',
                        format: 'esm',
                        target: 'esnext' // ensure it doesn't transpile modern syntax unnecessarily
                    });

                    // Write out the new JS/JSX file
                    // We need to also rewrite import extensions from .ts/.tsx to nothing or .js
                    let newCode = result.code;
                    // Vite resolves without extensions anyway for imports, but let's be safe.

                    await fs.writeFile(newPath, newCode, 'utf8');
                    await fs.unlink(res); // Delete old TS file
                    console.log(`Converted ${res} -> ${newPath}`);
                } catch (e) {
                    console.error("Failed to convert", res, e);
                }
            }
        }
    }
}

walkDir(path.resolve('./src')).then(() => console.log('Done convert files!'));
