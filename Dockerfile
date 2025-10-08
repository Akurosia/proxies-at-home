# Use the alpine Node.js 20 image.
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

# 5. Copy the rest of the application code
# This step is much faster than running all npm installs if only code changes.
COPY . .

# 2. Install dependencies (Root)
RUN npm install

# 3. Install dependencies (Client)
# Use a single command to maintain the layer if possible
RUN cd client && npm install

# 4. Install dependencies (Server)
RUN cd server && npm install

# Change ownership of the app directory to the node non-root user.
# The 'node' user is usually assigned uid 1000 in official node images.
RUN chown -R node:node /usr/src/app

# Switch to node non-root user.
USER node

# If your server uses a different entry point, adjust this:
# This command runs in the /usr/src/app directory as the 'node' user.
CMD ["npm", "run", "dev"]
