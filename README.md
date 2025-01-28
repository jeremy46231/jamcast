# Jamcast

I spent over 25 hours getting this to work. Why so long? Here's what I spent my time on, in approximate order:

- Researching Spotify APIs, determining what API to use, what library would work
- Getting a Spotify Premium account (thanks Arnav :D you're the best)
- Figuring out how to run a Docker devcontainer in VSCode
- Trying to obtain an installation of librespot, figuring out how cargo works
- Compiling librespot from cargo for ARM (both my local machine and my VPS are ARM)
- Setting up an alternate Slack account and figuring out how to programmatically log into it
- Researching the Slack huddle system and how others have integrated it, determining a browser would be the best way to do it
- Figuring out how to get Puppeteer reliably logging into Slack
- Trying to get Puppeteer to work in a Docker container
- Obtaining a copy of Chrome or Chromium for ARM (they only provide ARM builds for Windows)
- Fighting with various snap/flatpak/AppArmor/SELinux issues to control Chrome with Puppeteer
- Researching how Linux audio systems work, to get librespot to pipe into Chrome
- Trying to get a handle on PulseAudio's complicated mental model, figuring out what magic incantations make audio go from here to there
- Reading about cargo and how to compile a project with specific features
- Compiling librespot with support for PulseAudio
- Figuring out how to get Chrome to play audio from a specific source
- Trying to figure out why no audio is coming through the huddle
- Debugging librespot's audio output to get audio into the PulseAudio world
- Trying to figure out why the commands aren't properly connecting my null sink to my virtual microphone
- Figuring out which of Chrome's over 1,500 command line flags might help it pick up live audo from the virtual microphone
- Debugging, debugging, debugging why the audio isn't coming through
- Finally getting the audio to show up in the browser console
- Realizing that Slack still can't understand the microphone from Pulse
- Giving up on devcontainers, which has been a pain the whole time
- Re-setting up everything on my VPS directly, remoting in with VSCode's SSH support over Tailscale
- Getting everything to install in apprxoimately the same way on the VPS
- Reading about Pulse flags to try to make the microphone look like a real microphone
- Inspecting Slack's client-side code to see what it's looking for in a microphone
- Monkey-patching the MediaDevices API to control what Slack sees in an attempt to get it to recognize the audio
- Much debugging, much frustration, much confusion, nothing works
- Researching other methods to get audio into the browser, finding that webRTC can also create a MediaStream and that maybe I can patch it into a fake microphone API
- Trying to make a web frontend that can also stream the Spotify audio, because that's easier and the audio quality is better, though it's less convenient
- Figuring out how to encode the audio from Pulse into mp3 and stream it in chunks over HTTP Transfer-Encoding: chunked
- Relearning basic Svelte and the all-new runes syntax
- Making a basic frontend to play the audio, but it's incredibly glitchy and has about 5-10 seconds of latency, unacceptable
- Learning about the (limited) options for streaming audio in the browser, finding that webRTC is also the best option for low-latency audio
- Researching options for making a webRTC streaming server in Bun, finding that basically nobody does it and nobody knows what I'm talking about
- Looking back at librespot's output options, finding that it also has a GStreamer output option
- Researching GStreamer, finding that it has a really good webRTC plugin with adaptive bitrate and a signaling server and everything
- Installing GStreamer and the webRTC plugin, setting up permissions
- Compiling librespot with the GStreamer output option, figuring what dependencies I need
- Trying to get librespot to output to GStreamer, because of course it doesn't work
- Attempting to use the librespot pipe output or subprocess mode to get raw PCM into GStreamer, but it gives no output (librespot is broken and I don't know enough to fix it)
- Seeing that GStreamer can pick up audio from Pulse, so I can reuse my old painfully-won knowledge
- Fighting with a weird syntax error for a while until I read the librespot source code and realize the documentation is wrong
- [Fixing the librespot documentation](https://github.com/librespot-org/librespot/wiki/Audio-Backends/_compare/802ad02...1fd124d)
- Finding the source code to the GStreamer webRTC plugin's JS client library, because why would you document it or put it on npm let's just hide it in this random subfolder
- Making git checkout only that folder, installing the dependencies, and trying to build it
- Pulling the source code into my Svelte build system because the plugin's build system is broken
- Reading the GStreamer webRTC JS client library's source code to figure out how to use it
- Setting up a nice interface in Svelte to control the webRTC stream
- Learning all about the Web Audio API from MDN, making a neat visualizer so I can see the audio
- Realizing that it only works on Firefox, but not in Chrome or Safari, because of course it doesn't
- Researching the problem, but nobody has this issue ever somehow, but it works sometimes and then doesn't
- Reading the MediaDevices spec to make a standards-compliantish fake microphone using the MediaStream obtained via webRTC
- Debugging firewall issues in Oracle's complex interface and cryptic iptables rules to get connections to go through on plain IP addresses
- Finding many Chromium bugs and reading the Chromium source code to figure out that Chrome's audio system is architecturally broken
- Attempting to use the reccomended workaround of connecting the MediaStream to a blank audio element, but it doesn't work maybe
- Bypassing Chrome's restriction on insecure websocket connections on secure domains using one of the >1,500 command line flags it has
- Testing the audio, now the mic shows up but audio doesn't come through anywhere, even in my own tests
- Thinking that because Firefox has a much more reliable audio engine, it might be easier to use
- Figuring out how to get Firefox on my ARM VPS, because, similar to Chrome, they only provide ARM builds for Windows
- Debugging why Puppeteer can't debug Firefox, seeing an error about being unable to connect to the X server
- Going down a false rabbit hole involving a fake X server to fix that error, but it doesn't work
- Inspecting Puppeteer to determine that running Firefox with the certain command line makes it not output the debugger websocket URL
- Messing with Firefox flags to realize that the custom profile in /tmp/ is making it not output the debugger URL for some bizarre reason
- Manually patching Puppeteer to not use a custom profile and creating my own custom profile with the same configuration
- Modifying the Puppeteer script to work on Firefox as well, including clearing Slack cookies which wasn't necessary for Chrome
- Finding the poorly-documented Firefox preference to allow insecure websocket connections on secure domains and allow autoplay without user interaction
- Testing it and realizing that it doesn't work still
- Trying random things to get audio to start flowing through the audio system, but nothing works
- Exploring more workarounds, more ways of attaching a clock to the audio with a dummy audio element
- Trying to get the audio back out of the browser again, thinking it would force audio to flow through the system
- Installing ALSA and trying to run Chrome audio through it, but that didn't make anything change
- Deciding to explore running the puppeteer part locally, because I just want something to work at this point
- Turning off background audio supression and getting Puppeteer to persist that information
- Rejoicing when audio finally comes out of Slack, even though I have to run it locally

For my reference, here are the setup commands I used to install stuff on the VPS.

```sh
####### Root Needed
sudo su

# gstreamer and other utilities
# yes, this is scarily long
apt update && apt install curl unzip pkg-config build-essential libssl-dev tmux libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio

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
bun build-gstwebrtc-api

# done! to make sure it is all installed correctly:
librespot -B ? | grep gstreamer
gst-inspect-1.0 | grep webrtcsink
```
