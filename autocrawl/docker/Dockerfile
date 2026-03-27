FROM ubuntu:24.04

# Xvfb + dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    wget \
    ca-certificates \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Lightpanda (headless browser with CDP)
RUN wget -qO /usr/local/bin/lightpanda \
    https://github.com/nicholasgasior/lightpanda/releases/latest/download/lightpanda-linux-x86_64 \
    && chmod +x /usr/local/bin/lightpanda

EXPOSE 9222

# Xvfb + Lightpanda 동시 실행
CMD Xvfb :99 -screen 0 1280x720x24 & \
    export DISPLAY=:99 && \
    lightpanda --host 0.0.0.0 --port 9222
