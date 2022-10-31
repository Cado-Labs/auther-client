import { nodeResolve } from "@rollup/plugin-node-resolve"
import { babel } from '@rollup/plugin-babel'

const buildAssets = format => ({
  input: "src/index.js",
  output: {
    file: `dist/auther-client.${format}.js`,
    format,
  },
  plugins: [babel(), nodeResolve()],
})

const config = [buildAssets("cjs"), buildAssets("es")]

export default config
