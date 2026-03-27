FROM ubuntu:24.04

# Xvfb + dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    curl \
    ca-certificates \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Lightpanda (headless browser with CDP)
RUN curl -L -o /usr/local/bin/lightpanda \
    https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux \
    && chmod +x /usr/local/bin/lightpanda

EXPOSE 9222

# Xvfb + Lightpanda 동시 실행
CMD Xvfb :99 -screen 0 1280x720x24 & \
    export DISPLAY=:99 && \
    lightpanda serve --host 0.0.0.0 --port 9222
