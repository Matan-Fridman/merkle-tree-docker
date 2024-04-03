# Use the official Node.js 14 image as the base image
FROM node:14

# Create and set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files to the working directory
COPY . .

# Expose port 3000 to the outside world
EXPOSE 8080

# Command to run the server
CMD ["node", "server.js"]
