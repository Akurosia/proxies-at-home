# ---------- Build the frontend ----------
FROM node:20-alpine
WORKDIR /app
RUN npm run install
EXPOSE 5173
# If your server uses a different entry point, adjust this:
CMD ["npm", "run", "dev"]
