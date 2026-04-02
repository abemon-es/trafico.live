FROM nginx:alpine

# Enable HTTP range requests for PMTiles
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create data directories
RUN mkdir -p /data/tiles /data/fonts /data/sprites

# PMTiles file and font assets will be mounted from the host via volumes
# /data/tiles/spain.pmtiles
# /data/fonts/ (Noto Sans font glyphs)

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/health || exit 1
