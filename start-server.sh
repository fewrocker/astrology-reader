#!/bin/bash
set -a
source /projects/astrology-reader/.env
set +a
exec node /projects/astrology-reader/dist-server/index.js
