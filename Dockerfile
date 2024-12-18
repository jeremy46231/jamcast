FROM debian:stable

# Install apt packages
RUN apt-get update && \
    apt-get install -y curl unzip pkg-config build-essential libasound2-dev alsa-utils libpulse-dev libjack-dev

# Install rust and compile librespot
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y && \
    export PATH="$HOME/.cargo/bin:$PATH" && \
    rustup default stable && \
    cargo install librespot --features "alsa-backend pulseaudio-backend jackaudio-backend"

# Install bun and puppeteer
RUN curl -fsSL https://bun.sh/install | bash && \
    export PATH="$HOME/.bun/bin:$PATH"
