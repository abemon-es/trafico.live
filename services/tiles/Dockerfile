FROM nginx:alpine

# Enable HTTP range requests for PMTiles
# Serve tiles with proper CORS headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create data directory
RUN mkdir -p /data/tiles /data/fonts /data/sprites

# Download font assets for Protomaps (Noto Sans family)
RUN apk add --no-cache curl unzip && \
    curl -L -o /tmp/fonts.zip "https://github.com/protomaps/basemaps-assets/releases/latest/download/fonts.zip" && \
    unzip -o /tmp/fonts.zip -d /data/fonts && \
    rm /tmp/fonts.zip && \
    apk del curl unzip

# PMTiles file will be mounted as a volume from the host
# /data/tiles/spain.pmtiles

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/health || exit 1
