#!/bin/bash

# shellcheck disable=SC1091
# source .env
mkdir -p .librespot

# # assume signalling server is running on localhost:8443
# librespot \
#     --enable-oauth -c ./.librespot \
#     --name "Jamcast" --device-type "avr" \
#     --autoplay on --initial-volume 100 \
#     --backend subprocess \
#     --device 'gst-launch-1.0 webrtcsink name=ws meta="meta,name=librespotmaybe" videotestsrc ! ws. fdsrc fd=0 ! audioconvert ! ws.'
#     # gst-launch-1.0 \
#     #     fdsrc fd=0 ! \
#     #     audioconvert dithering=none ! \
#     #     webrtcsink run-signalling-server=true
#     # --backend gstreamer --device 'audioconvert dithering=none ! audioresample ! webrtcsink run-signalling-server=false'

# gst-launch-1.0 -v \
#     videotestsrc ! \
#     webrtcsink run-signalling-server=true

ifySink
# OLD PULSEAUDIO CODE

# ensure pulseaudio is running
pulseaudio --start
pactl unload-module module-null-sink
pactl load-module module-null-sink sink_name=NullSink
pactl load-module module-null-sink sink_name=SpotifySink
pacmd set-default-sink NullSink
pacmd set-default-source SpotifySink.monitor

librespot \
    --enable-oauth -c ./.librespot \
    --name "Jamcast" --device-type "avr" \
    --backend "pulseaudio" --device "SpotifySink" \
    --autoplay on --initial-volume 100 &

gst-launch-1.0 \
    pulsesrc ! \
    audioconvert dithering=none ! \
    audioresample ! \
    webrtcsink meta="meta,name=jamcast-stream" run-signalling-server=true  signalling-server-port=46232

wait
