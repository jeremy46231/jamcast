#!/bin/bash

mkdir -p .librespot

pulseaudio --start
pactl unload-module module-null-sink
pactl load-module module-null-sink sink_name=SpotifySink

SESSION_NAME="jamcast"
tmux new-session -d -s "$SESSION_NAME"
tmux split-window -h -t "$SESSION_NAME"

tmux send-keys -t "$SESSION_NAME:0.0" "\
  librespot \
    --enable-oauth -c ./.librespot \
    --name 'Jamcast' --device-type 'avr' \
    --backend 'pulseaudio' --device 'SpotifySink' \
    --autoplay on --initial-volume 100 \
" C-m

tmux send-keys -t "$SESSION_NAME:0.1" "\
  gst-launch-1.0 \
    pulsesrc ! \
    audioconvert dithering=none ! \
    audioresample ! \
    webrtcsink \
      meta='meta,name=jamcast-stream' \
      run-signalling-server=true signalling-server-port=46232 \
" C-m

tmux attach -t "$SESSION_NAME"
