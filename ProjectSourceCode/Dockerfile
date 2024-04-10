FROM node:14

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Add this line to rebuild bcrypt for the container's environment
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of your application code
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]


