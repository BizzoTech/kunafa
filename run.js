const fs = require('fs-extra');
const exec = require('child_process').exec;

const executeCommand = command => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      if (stderr) {
        return resolve(stderr);
      }
      return resolve(stdout);
    });
  });
}


const dontCopy = ['dist', 'node_modules', 'package.json', 'yarn.lock', 'run.js'];

const start = async() => {
  const currentPath = await fs.realpath('.');
  const projectName = currentPath.split('/').pop();

  const distDir = `dist/${projectName}`;

  await fs.emptyDir(distDir);

  const kunafaDirContents = await fs.readdir('node_modules/kunafa');
  //console.log(kunafaDirContents);
  for(fileName of kunafaDirContents){
    if(!dontCopy.includes(fileName)){
      await fs.copy(`node_modules/kunafa/${fileName}`, `${distDir}/${fileName}`);
    }
  }
  const currentDirContents = await fs.readdir('.');
  //console.log(currentDirContents);
  for(fileName of currentDirContents){
    if(!dontCopy.includes(fileName)){
      await fs.copy(fileName, `${distDir}/${fileName}`);
    }
  }
  try {
    const result = await executeCommand(`cd ${distDir} && docker-compose up --build -d`);
    console.log(result);
  } catch (e) {
    console.log(e)
  }

}

start();
