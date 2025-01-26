# Jamcast

```sh
####### Root Needed
sudo su

# gstreamer and other utilities
# yes, this is scarily long
apt update && apt install curl unzip pkg-config build-essential libssl-dev nodejs firefox libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio 

# rust toolchain
curl -fsSL https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env" && rustup default stable

# librespot with pulse support
cargo install librespot --features "pulseaudio-backend"
cp $(which librespot) /usr/bin/librespot && chmod +x /usr/bin/librespot

# gstreamer webrtc plugin
git clone https://gitlab.freedesktop.org/gstreamer/gst-plugins-rs.git && cd gst-plugins-rs
cargo install cargo-c
cargo cinstall -p gst-plugin-webrtc --prefix=/usr --no-default-features
# ^ this command is why root is needed

exit
####### Root no longer needed past this point

# install bun and install dependencies
# make sure you cd back to the jamcast directory if needed
curl -fsSL https://bun.sh/install | bash
# alternate: npm i -g bun
bun i

# done! to make sure it is all installed correctly:
librespot -B ? | grep gstreamer
gst-inspect-1.0 | grep webrtcsink
```
