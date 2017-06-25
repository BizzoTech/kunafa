FROM node:7.5.0

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install && npm cache clean
COPY . /usr/src/app

EXPOSE 3000

CMD [ "npm", "run", "start:production" ]
