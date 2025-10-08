# ---------- Build the frontend ----------
# Use the alpine Node.js 20 image.
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package.json ./

# Install dependencies.
RUN npm run install

# Copy local code to the container image.
COPY . .

# Change ownership of the app directory to the node non-root user.
RUN chown -R node:node /usr/src/app

# Switch to node non-root user.
USER node
# If your server uses a different entry point, adjust this:
CMD ["npm", "run", "dev"]
