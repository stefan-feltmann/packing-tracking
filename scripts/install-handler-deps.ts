import fs = require('fs')
import child_process = require('child_process')
;(async () => {
  const dirs = ['lib', 'bin', 'handlers']
  for (const dir of dirs) {
    process.chdir(dir)
    const items = fs.readdirSync('./')
    for (const handlerDir of items) {
      const handlerPath = `./${handlerDir}`
      const stat = await fs.promises.lstat(handlerPath)
      if (!stat.isDirectory()) {
        continue
      }
      install(handlerPath, handlerDir)
    }

    process.chdir('..')
    install(`./${dir}`, dir)
  }

  console.log('Done installing handler dependencies!')
})()

function install(handlerPath: string, handlerDir: string) {
  const handlerItems = fs.readdirSync(handlerPath)
  if (handlerItems.some((item) => item === 'package.json')) {
    console.log(`Installing dependencies for ${handlerDir}...`)
    process.chdir(handlerDir)
    child_process.execSync('npm install')
    child_process.execSync('npm ci')
    process.chdir('..')
  }
}
