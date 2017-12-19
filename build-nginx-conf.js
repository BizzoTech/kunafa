const Handlebars = require('handlebars');


const fs = require('fs-extra');


exports = async(distDir, plugins) => {
  const nginxConf = await fs.readFile('./nginx-conf/template.hbs', 'utf8');
  const template = Handlebars.compile(nginxConf);

  const baseContextDirContents = await fs.readdir('./nginx-conf/context');

  const context = {};

  for (const fileName of baseContextDirContents) {
    const currentValue = context[fileName] ? context[fileName] + '\n' : "";
    context[fileName] = currentValue +  await fs.readFile(`./nginx-conf/context/${fileName}`, 'utf8');
  }

  for (const plugin of plugins) {
    if(fs.existsSync(`node_modules/${plugin}/nginx-conf/context`)){
      const contextDirContents = await fs.readdir(`node_modules/${plugin}/nginx-conf/context`);
      for (const fileName of contextDirContents) {
        const currentValue = context[fileName] ? context[fileName] + '\n' : "";
        context[fileName] = currentValue +  await fs.readFile(`node_modules/${plugin}/nginx-conf/context/${fileName}`, 'utf8');
      }
    }
  }

  const nginxConfUpdated =  template(context);
  await fs.writeFile(`${distDir}/nginx.conf`, nginxConfUpdated);
}
