FROM ghcr.io/maplibre/martin:v0.15.0

COPY config.yaml /config.yaml

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["--config", "/config.yaml"]
