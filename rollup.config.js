import { nodeResolve } from "@rollup/plugin-node-resolve"

const buildAssets = format => ({
  input: "src/index.js",
  output: {
    file: `dist/auther-client.${format}.js`,
    format,
  },
  plugins: [nodeResolve()],
})

const config = [buildAssets("cjs"), buildAssets("es")]

export default config
