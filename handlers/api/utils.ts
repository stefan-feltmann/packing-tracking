export function getEnvVar(variable: string): string {
  let output = ''
  let env = process.env[variable]
  if (env && typeof env !== 'undefined') {
    output = env
  }
  return output
}
