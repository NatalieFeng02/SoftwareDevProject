# Build stage
FROM node:14-alpine as builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Rebuilding bcrypt and canvas modules as before
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of your application code
COPY . .

# Final stage
FROM node:14

WORKDIR /usr/src/app

# Copy built node modules and compiled code from the builder stage
COPY --from=builder /usr/src/app .

EXPOSE 3000

CMD ["node", "index.js"]






