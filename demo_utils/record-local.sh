# npx playwright test demo_video.spec.ts --headed &
ffmpeg \
  -video_size 1280x1080 \
  -framerate 24 \
  -f x11grab -i :0.0+3275,+118 \
  -c:a copy \
  -c:v libx264rgb \
  -crf 0 \
  -preset ultrafast \
  ./dist/video.mp4 \
  -y

