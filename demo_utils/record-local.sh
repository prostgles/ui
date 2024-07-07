# npx playwright test demo_video.spec.ts --headed &
ffmpeg \
  -video_size 3200x2000 \
  -framerate 24 \
  -qscale 1 \
  -f x11grab -i :0.0 \
  -c:a copy \
  -c:v libx264rgb \
  -crf 0 \
  -preset ultrafast \
  video.mp4 \
  -y
