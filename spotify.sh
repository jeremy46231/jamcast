#!/bin/bash
source .env

librespot \
    --name "Jamcast" --device-type "avr" --access-token $ACCESS_TOKEN \
    --backend "pulseaudio" \
    --autoplay --initial-volume 100 --volume-normalisation
