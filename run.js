const fs = require('fs-extra');
const exec = require('child_process').exec;
const process = require('process');
const yaml = require('js-yaml');
const R = require('ramda');


const updateYamlFile = (filePath, buildType) => {
  const doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
  const updatedServices = R.map(service => {
    const serviceWithEnv = R.merge(service, {
      environment: ['COUCHDB_USER', 'COUCHDB_PASSWORD', `BUILD_TYPE=${buildType}`, ...(service.environment || [])]
    });
    return R.merge({restart: "always", mem_limit: '200m', cpus: 0.5}, serviceWithEnv);
  }, doc.services);
  const updatedDoc = R.merge(doc, {services: updatedServices});
  fs.writeFileSync(filePath, yaml.safeDump(updatedDoc));
}

const executeCommand = command => {
  return new Promise((resolve, reject) => {
    childProcess = exec(command, {maxBuffer: Infinity}, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      if (stderr) {
        return resolve(stderr);
      }
      return resolve(stdout);
    });
    childProcess.stdout.on('data', console.log);
    childProcess.stderr.on('data', console.log);
  });
}


const dontCopy = ['dist', 'node_modules', 'package.json', 'yarn.lock', 'run.js'];

const start = async() => {
  try {
    const currentPath = await fs.realpath('.');
    const projectName = currentPath.split('/').pop();
    const BUILD_TYPE = process.argv.length > 2 ? process.argv[2] : "debug";

    const distDir = `dist/${projectName}-${BUILD_TYPE}`;

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
      if(!dontCopy.includes(fileName) && !fileName.startsWith('.env')){
        await fs.copy(fileName, `${distDir}/${fileName}`);
      }
    }

    await fs.copy(`.env.${BUILD_TYPE}`, `${distDir}/.env`);

    updateYamlFile(`${distDir}/docker-compose.yml`, BUILD_TYPE);
    updateYamlFile(`${distDir}/docker-compose.override.yml`, BUILD_TYPE);

    const result = await executeCommand(`cd ${distDir} && docker-compose up --build -d`);
    console.log(result);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}

start();
