# Use an official Node.js runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files first to leverage Docker cache
COPY package*.json ./

# Install dependencies, using legacy-peer-deps to avoid dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Copy the environment variables file (if using .env)
COPY .env .env

# Expose the port the app will run on
EXPOSE 4000

# Command to run the application
CMD [ "npm", "start" ]
