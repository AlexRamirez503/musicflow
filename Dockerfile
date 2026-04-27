FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
COPY public ./public
EXPOSE 10000
ENV PORT=10000
CMD ["node", "index.js"]
