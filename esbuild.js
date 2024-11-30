const esbuild = require('esbuild');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: true,
    sourcemap: false,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
  });
  await ctx.rebuild();
  await ctx.dispose();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
