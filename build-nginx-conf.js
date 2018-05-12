const Handlebars = require('handlebars');


const fs = require('fs-extra');

const process = require('process');
const BUILD_TYPE = process.argv.length > 2 ? process.argv[2] : "debug";

module.exports = async(distDir, plugins) => {
  const nginxConf = await fs.readFile('./node_modules/kunafa/nginx-conf/template.hbs', 'utf8');
  const template = Handlebars.compile(nginxConf);

  const baseContextDirContents = await fs.readdir('./node_modules/kunafa/nginx-conf/context');

  const context = {};

  for (const fileName of baseContextDirContents) {
    const currentValue = context[fileName] ? context[fileName] + '\n' : "";
    context[fileName] = currentValue +  await fs.readFile(`./node_modules/kunafa/nginx-conf/context/${fileName}`, 'utf8');
  }

  for (const plugin of plugins) {
    if(fs.existsSync(`./node_modules/${plugin}/nginx-conf/context`)){
      const contextDirContents = await fs.readdir(`./node_modules/${plugin}/nginx-conf/context`);
      for (const fileName of contextDirContents) {
        const currentValue = context[fileName] ? context[fileName] + '\n' : "";
        context[fileName] = currentValue +  await fs.readFile(`./node_modules/${plugin}/nginx-conf/context/${fileName}`, 'utf8');
      }
    }
  }


  if(fs.existsSync('./nginx-conf/context')){
    const appContextDirContents = await fs.readdir('./nginx-conf/context');
    for (const fileName of appContextDirContents) {
      const currentValue = context[fileName] ? context[fileName] + '\n' : "";
      context[fileName] = currentValue +  await fs.readFile(`./nginx-conf/context/${fileName}`, 'utf8');
    }
  }

  if(fs.existsSync(`./nginx-conf/${BUILD_TYPE}`)){
    const appContextDirContents = await fs.readdir(`./nginx-conf/${BUILD_TYPE}`);
    for (const fileName of appContextDirContents) {
      const currentValue = context[fileName] ? context[fileName] + '\n' : "";
      context[fileName] = currentValue +  await fs.readFile(`./nginx-conf/${BUILD_TYPE}/${fileName}`, 'utf8');
    }
  }
  

  const nginxConfUpdated =  template(context);
  await fs.writeFile(`./${distDir}/nginx.conf`, nginxConfUpdated);
}
